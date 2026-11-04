import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
const pluginVersion = (JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as { version: string }).version;

interface SinceMapCache {
    obsidianPackageVersion?: string;
    pluginVersion?: string;
    entries: [string, string][];
}

const readCache = () => JSON.parse(fs.readFileSync(cachePath, "utf8")) as SinceMapCache;

// A map rebuilt from obsidian.d.ts: written for this obsidian and this plugin,
// with the @since of each kind of declaration the rule reads.
function assertRebuilt(): void {
    const rebuilt = readCache();
    assert.strictEqual(rebuilt.obsidianPackageVersion, obsidianVersion);
    assert.strictEqual(rebuilt.pluginVersion, pluginVersion);
    const entries = new Map(rebuilt.entries);
    assert.deepStrictEqual(
        ["AbstractInputSuggest", "App.renderContext", "App.isDarkMode", "WorkspaceLeaf.isDeferred", "Array.findLastIndex", "setTooltip", "Notice"].map(
            (name) => [name, entries.get(name)],
        ),
        [
            ["AbstractInputSuggest", "1.4.10"],
            ["App.renderContext", "1.10.0"],
            ["App.isDarkMode", "1.10.0"],
            ["WorkspaceLeaf.isDeferred", "1.7.2"],
            ["Array.findLastIndex", "1.4.4"],
            ["setTooltip", "1.4.4"],
            ["Notice", "0.9.7"],
        ],
    );
}

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
        assertRebuilt();
    });

    it("is reused when this plugin version wrote it", async () => {
        const current = readCache();
        fs.writeFileSync(cachePath, JSON.stringify({ ...current, entries: [["Notice", "99.0.0"]] }));
        assert.strictEqual(await reportsForNotice(), 1);
    });

    it("is rebuilt when another obsidian version wrote it, though the plugin is the same", async () => {
        fs.writeFileSync(cachePath, JSON.stringify({
            obsidianPackageVersion: "0.0.1",
            pluginVersion,
            entries: [["Notice", "99.0.0"]],
        }));
        assert.strictEqual(await reportsForNotice(), 0);
        assertRebuilt();
    });

    it("is rebuilt, without failing the lint, when it is not JSON", async () => {
        fs.writeFileSync(cachePath, "{ not json");
        assert.strictEqual(await reportsForNotice(), 0);
        assertRebuilt();
    });
});

// getManifest() reads manifest.json from the process cwd once, so the rule
// without a minAppVersion runs in a fresh process whose cwd has no manifest.
describe("no-unsupported-api without a minAppVersion", function () {
    this.timeout(60000);

    it("reports nothing, and does not fail, with neither the option nor a manifest", async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "no-unsupported-api-"));
        const script = `
            import path from "node:path";
            const { Linter } = await import(${JSON.stringify(pathToFileURL(requireHere.resolve("eslint")).href)});
            const { default: tseslint } = await import(${JSON.stringify(pathToFileURL(requireHere.resolve("typescript-eslint")).href)});
            const { default: rule } = await import(${JSON.stringify(ruleUrl)});
            const root = ${JSON.stringify(repoRoot)};
            // The Linter works from the repo; only the process cwd has no manifest.
            // The same code with the option is the control: the rule does run.
            const lint = (entry) => new Linter({ cwd: root }).verify(
                'import { App } from "obsidian";\\ndeclare const app: App;\\napp.renderContext;\\n',
                [{
                    files: ["**/*.ts"],
                    languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: root, disallowAutomaticSingleRunInference: true },
                    },
                    plugins: { obsidianmd: { rules: { "no-unsupported-api": rule } } },
                    rules: { "obsidianmd/no-unsupported-api": entry },
                }],
                path.join(root, "file.ts"),
            ).map((m) => m.message);
            console.log(JSON.stringify([lint("error"), lint(["error", { minAppVersion: "1.0.0" }])]));
        `;
        try {
            const { stdout } = await promisify(execFile)(
                process.execPath,
                ["--import", tsxLoader, "--input-type=module", "-e", script],
                { cwd: dir },
            );
            assert.deepStrictEqual(JSON.parse(stdout.trim().split("\n").pop() ?? "null"), [
                [],
                ["'App.renderContext' requires Obsidian v1.10.0, but minAppVersion is 1.0.0."],
            ]);
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
});
