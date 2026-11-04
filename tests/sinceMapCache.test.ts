import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { after, before, describe, it } from "mocha";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const requireHere = createRequire(import.meta.url);
const tsxLoader = pathToFileURL(requireHere.resolve("tsx")).href;
const ruleUrl = new URL("../lib/rules/noUnsupportedApi.ts", import.meta.url).href;
const obsidianDir = path.dirname(requireHere.resolve("obsidian/package.json"));
const obsidianVersion = (JSON.parse(fs.readFileSync(path.join(obsidianDir, "package.json"), "utf8")) as { version: string }).version;
const cachePath = path.join(obsidianDir, "..", ".cache", "eslint-plugin-obsidianmd", "since-map.json");

// no-unsupported-api keeps the map of @since versions in memory for the whole
// process, so each run here starts a fresh process that reads the cache file.
async function reportsForNotice(): Promise<number> {
    const script = `
        import path from "node:path";
        import { Linter } from "eslint";
        import tseslint from "typescript-eslint";
        const { default: rule } = await import(${JSON.stringify(ruleUrl)});
        const messages = new Linter().verify(
            'import { Notice } from "obsidian";\\nnew Notice("x");\\n',
            [{
                files: ["**/*.ts"],
                languageOptions: {
                    parser: tseslint.parser,
                    parserOptions: { project: "./tsconfig.json", tsconfigRootDir: process.cwd(), disallowAutomaticSingleRunInference: true },
                },
                plugins: { obsidianmd: { rules: { "no-unsupported-api": rule } } },
                rules: { "obsidianmd/no-unsupported-api": ["error", { minAppVersion: "1.0.0" }] },
            }],
            path.join(process.cwd(), "file.ts"),
        );
        console.log(JSON.stringify(messages.map((m) => m.message)));
    `;
    const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--import", tsxLoader, "--input-type=module", "-e", script],
        { cwd: repoRoot },
    );
    return (JSON.parse(stdout.trim().split("\n").pop() ?? "[]") as string[]).length;
}

describe("no-unsupported-api's cached @since map", function () {
    this.timeout(60000);
    let saved: string | undefined;

    before(() => {
        saved = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, "utf8") : undefined;
    });

    after(() => {
        if (saved === undefined) {
            fs.rmSync(cachePath, { force: true });
        } else {
            fs.writeFileSync(cachePath, saved);
        }
    });

    it("is rebuilt when an older plugin version wrote it, though obsidian is the same", async () => {
        // A map an older release could have written for this obsidian version,
        // claiming Notice needs Obsidian 99. Reusing it would report `new Notice()`.
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify({
            obsidianPackageVersion: obsidianVersion,
            pluginVersion: "0.0.1",
            entries: [["Notice", "99.0.0"]],
        }));
        assert.strictEqual(await reportsForNotice(), 0);
        const rebuilt = JSON.parse(fs.readFileSync(cachePath, "utf8")) as { pluginVersion?: string };
        assert.notStrictEqual(rebuilt.pluginVersion, "0.0.1");
    });

    it("is reused when this plugin version wrote it", async () => {
        const current = JSON.parse(fs.readFileSync(cachePath, "utf8")) as { pluginVersion?: string; entries: [string, string][] };
        fs.writeFileSync(cachePath, JSON.stringify({ ...current, entries: [["Notice", "99.0.0"]] }));
        assert.strictEqual(await reportsForNotice(), 1);
    });
});
