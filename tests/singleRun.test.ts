import assert from "node:assert";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, it } from "mocha";
import { fixDryRunConfigs } from "../lib/singleRun.js";

const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const indexUrl = new URL("../lib/index.ts", import.meta.url).href;
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// The recommended config reads process.argv when it is built, so each case
// builds it in a fresh process with the command-line flags under test.
async function singleRunOptionFor(files: string[], args: string[]): Promise<Record<string, unknown>> {
    const script = `
        import { ESLint } from "eslint";
        const { default: obsidianmd } = await import(${JSON.stringify(indexUrl)});
        const eslint = new ESLint({ cwd: ${JSON.stringify(repoRoot)}, overrideConfigFile: true, overrideConfig: obsidianmd.configs.recommended });
        const result = {};
        for (const file of ${JSON.stringify(files)}) {
            const config = await eslint.calculateConfigForFile(file);
            result[file] = config?.languageOptions?.parserOptions?.disallowAutomaticSingleRunInference ?? null;
        }
        console.log(JSON.stringify(result));
    `;
    const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--import", tsxLoader, "--input-type=module", "-e", script, "--", ...args],
        { cwd: repoRoot },
    );
    return JSON.parse(stdout.trim().split("\n").pop() ?? "{}") as Record<string, unknown>;
}

describe("--fix-dry-run and typescript-eslint's single-run mode", function () {
    this.timeout(60000);

    it("adds nothing without --fix-dry-run; typescript-eslint exempts --fix itself", () => {
        assert.deepStrictEqual(fixDryRunConfigs(["node", "eslint", "."]), []);
        assert.deepStrictEqual(fixDryRunConfigs(["node", "eslint", "--fix", "."]), []);
    });

    it("turns single-run inference off for JS and TS files with --fix-dry-run", () => {
        const configs = fixDryRunConfigs(["node", "eslint", "--fix-dry-run", "--fix-type", "problem", "."]);
        assert.strictEqual(configs.length, 1);
        assert.deepStrictEqual(configs[0]?.files, ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"]);
        assert.deepStrictEqual(configs[0]?.languageOptions?.parserOptions, {
            disallowAutomaticSingleRunInference: true,
        });
    });

    it("the recommended config sets it on JS and TS files under --fix-dry-run, and nowhere else", async () => {
        const files = ["src/main.ts", "src/view.tsx", "main.js", "manifest.json"];
        assert.deepStrictEqual(await singleRunOptionFor(files, ["--fix-dry-run"]), {
            "src/main.ts": true,
            "src/view.tsx": true,
            "main.js": true,
            "manifest.json": null,
        });
        assert.deepStrictEqual(await singleRunOptionFor(files, ["--fix"]), {
            "src/main.ts": null,
            "src/view.tsx": null,
            "main.js": null,
            "manifest.json": null,
        });
    });
});
