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

// The shape of the entries this build writes: the @since of each declaration of
// a name, by its position in obsidian.d.ts, with null for an undated overload.
const format = 2;

interface SinceMapCache {
    format?: number;
    obsidianPackageVersion?: string;
    pluginVersion?: string;
    entries: unknown[];
}

const readCache = () => JSON.parse(fs.readFileSync(cachePath, "utf8")) as SinceMapCache;

// A map rebuilt from obsidian.d.ts: written for this obsidian and this plugin,
// with the @since of each kind of declaration the rule reads.
function assertRebuilt(): void {
    const rebuilt = readCache();
    assert.strictEqual(rebuilt.format, format);
    assert.strictEqual(rebuilt.obsidianPackageVersion, obsidianVersion);
    assert.strictEqual(rebuilt.pluginVersion, pluginVersion);
    const entries = new Map(rebuilt.entries as [string, [number, string | null][]][]);
    assert.deepStrictEqual(
        [
            "AbstractInputSuggest",
            "App.renderContext",
            "App.isDarkMode",
            "WorkspaceLeaf.isDeferred",
            "Array.findLastIndex",
            "setTooltip",
            "Notice",
            "Workspace.duplicateLeaf",
            "Workspace.setActiveLeaf",
        ].map((name) => [name, entries.get(name)?.map(([, since]) => since)]),
        [
            ["AbstractInputSuggest", ["1.4.10"]],
            ["App.renderContext", ["1.10.0"]],
            ["App.isDarkMode", ["1.10.0"]],
            ["WorkspaceLeaf.isDeferred", ["1.7.2"]],
            ["Array.findLastIndex", ["1.4.4"]],
            ["setTooltip", ["1.4.4"]],
            ["Notice", ["0.9.7"]],
            // One per overload, each with its own @since.
            ["Workspace.duplicateLeaf", ["0.13.8", "1.1.0"]],
            ["Workspace.setActiveLeaf", ["0.16.3", null]],
        ],
    );
    // Each declaration by where it starts, so no two share a position.
    const positions = entries.get("Workspace.duplicateLeaf")?.map(([position]) => position) ?? [];
    assert.strictEqual(new Set(positions).size, 2);
}

// A map in the current shape that claims Notice needs Obsidian 99.
const noticeFrom99 = [["Notice", [[0, "99.0.0"]]]];

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
            format,
            obsidianPackageVersion: obsidianVersion,
            pluginVersion: "0.0.1",
            entries: noticeFrom99,
        }));
        assert.strictEqual(await reportsForNotice(), 0);
        assertRebuilt();
    });

    it("is reused when this plugin version wrote it", async () => {
        const current = readCache();
        fs.writeFileSync(cachePath, JSON.stringify({ ...current, entries: noticeFrom99 }));
        assert.strictEqual(await reportsForNotice(), 1);
    });

    it("is rebuilt when another obsidian version wrote it, though the plugin is the same", async () => {
        fs.writeFileSync(cachePath, JSON.stringify({
            format,
            obsidianPackageVersion: "0.0.1",
            pluginVersion,
            entries: noticeFrom99,
        }));
        assert.strictEqual(await reportsForNotice(), 0);
        assertRebuilt();
    });

    it("is rebuilt when it holds one version per name, the format before overloads, though obsidian and the plugin are the same", async () => {
        // What this plugin wrote before each overload had its own version: a
        // development build of the same version can have left it behind.
        fs.writeFileSync(cachePath, JSON.stringify({
            obsidianPackageVersion: obsidianVersion,
            pluginVersion,
            entries: [["Notice", "99.0.0"]],
        }));
        assert.strictEqual(await reportsForNotice(), 0);
        assertRebuilt();
    });

    it("is rebuilt when another format wrote it, though obsidian and the plugin are the same", async () => {
        for (const other of [undefined, format - 1, format + 1]) {
            fs.writeFileSync(cachePath, JSON.stringify({
                format: other,
                obsidianPackageVersion: obsidianVersion,
                pluginVersion,
                entries: noticeFrom99,
            }));
            assert.strictEqual(await reportsForNotice(), 0);
            assertRebuilt();
        }
    });

    it("is rebuilt when its entries are not in the shape its format names", async () => {
        fs.writeFileSync(cachePath, JSON.stringify({
            format,
            obsidianPackageVersion: obsidianVersion,
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
