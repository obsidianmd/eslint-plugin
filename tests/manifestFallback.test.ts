import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { before, describe, it } from "mocha";

// getManifest() caches at module level and reads manifest.json from the process
// cwd, so every test in this process sees the repo's own manifest. Each case
// here runs manifestFallback.child.ts in a fresh process whose cwd is a
// temporary directory holding the manifest under test.
const childScript = fileURLToPath(new URL("./manifestFallback.child.ts", import.meta.url));
const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;

interface ChildResult {
    noNodejsModules: {
        unset: number;
        forcedOn: number;
        tsEntry: unknown;
        jsEntry: unknown;
    };
    regexLookbehind: {
        unset: number;
    };
    nodeGlobals: {
        ts: boolean;
        js: boolean;
    };
    nodeNamespace: {
        ts: boolean;
        js: boolean;
    };
    noDeprecated: {
        tsEntry: [number, { allow: { name: string }[] }];
    };
    settingsHeadingPluginName: number;
}

interface ChildRun {
    result: ChildResult;
    stderr: string;
}

async function runWithManifest(manifest: string | null): Promise<ChildRun> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-fallback-"));
    try {
        if (manifest !== null) {
            fs.writeFileSync(path.join(dir, "manifest.json"), manifest);
        }
        const { stdout, stderr } = await promisify(execFile)(
            process.execPath,
            ["--import", tsxLoader, childScript],
            { cwd: dir },
        );
        return { result: JSON.parse(stdout) as ChildResult, stderr };
    } finally {
        fs.rmSync(dir, { recursive: true });
    }
}

describe("manifest fallback in the linted repo's working directory", () => {
    let desktopOnly: ChildRun;
    let stringFalse: ChildRun;
    let noManifest: ChildRun;
    let declarativeSettings: ChildRun;
    let preDeclarativeSettings: ChildRun;
    let stringName: ChildRun;
    let numberName: ChildRun;

    before(async function () {
        this.timeout(60000);
        [
            desktopOnly,
            stringFalse,
            noManifest,
            declarativeSettings,
            preDeclarativeSettings,
            stringName,
            numberName,
        ] = await Promise.all([
            runWithManifest(JSON.stringify({ isDesktopOnly: true })),
            runWithManifest(JSON.stringify({ isDesktopOnly: "false" })),
            runWithManifest(null),
            runWithManifest(JSON.stringify({ minAppVersion: "1.13.0" })),
            runWithManifest(JSON.stringify({ minAppVersion: "1.12.7" })),
            runWithManifest(JSON.stringify({ name: "Sample Plugin" })),
            runWithManifest(JSON.stringify({ name: 123 })),
        ]);
    });

    describe("settings-tab/no-problematic-settings-headings", () => {
        it("reports a heading with the manifest's plugin name", () => {
            assert.strictEqual(stringName.result.settingsHeadingPluginName, 1);
        });

        it("skips the plugin-name check when the manifest's name is not a string", () => {
            assert.strictEqual(numberName.result.settingsHeadingPluginName, 0);
        });
    });

    describe("no-nodejs-modules", () => {
        it("is quiet with the option unset when the manifest is desktop-only", () => {
            assert.strictEqual(desktopOnly.result.noNodejsModules.unset, 0);
        });

        it("reports with isDesktopOnly: false despite a desktop-only manifest", () => {
            assert.strictEqual(desktopOnly.result.noNodejsModules.forcedOn, 1);
        });

        it("reports with the option unset when isDesktopOnly is the string \"false\"", () => {
            assert.strictEqual(stringFalse.result.noNodejsModules.unset, 1);
        });

        it("reports with the option unset when there is no manifest", () => {
            assert.strictEqual(noManifest.result.noNodejsModules.unset, 1);
        });

        it("stays at warn in the recommended config for TS and JS when the manifest is desktop-only", () => {
            // The rule reads the manifest itself; the config no longer turns it off.
            assert.deepStrictEqual(desktopOnly.result.noNodejsModules.tsEntry, [1]);
            assert.deepStrictEqual(desktopOnly.result.noNodejsModules.jsEntry, [1]);
        });
    });

    describe("regex-lookbehind", () => {
        it("is quiet with the option unset when the manifest is desktop-only", () => {
            assert.strictEqual(desktopOnly.result.regexLookbehind.unset, 0);
        });

        it("reports with the option unset when isDesktopOnly is the string \"false\"", () => {
            assert.strictEqual(stringFalse.result.regexLookbehind.unset, 1);
        });

        it("reports with the option unset when there is no manifest", () => {
            assert.strictEqual(noManifest.result.regexLookbehind.unset, 1);
        });
    });

    describe("Node globals in the recommended config", () => {
        it("are added when the manifest is desktop-only", () => {
            assert.deepStrictEqual(desktopOnly.result.nodeGlobals, { ts: true, js: true });
        });

        it("are not added when isDesktopOnly is the string \"false\"", () => {
            assert.deepStrictEqual(stringFalse.result.nodeGlobals, { ts: false, js: false });
        });

        it("are not added when there is no manifest", () => {
            assert.deepStrictEqual(noManifest.result.nodeGlobals, { ts: false, js: false });
        });

        it("include the NodeJS namespace when the manifest is desktop-only", () => {
            assert.deepStrictEqual(desktopOnly.result.nodeNamespace, { ts: true, js: true });
            assert.deepStrictEqual(stringFalse.result.nodeNamespace, { ts: false, js: false });
            assert.deepStrictEqual(noManifest.result.nodeNamespace, { ts: false, js: false });
        });
    });

    describe("@typescript-eslint/no-deprecated in the recommended config", () => {
        function allowed(run: ChildRun): string[] {
            return run.result.noDeprecated.tsEntry[1].allow.map((specifier) => specifier.name);
        }

        it("allows SettingTab#display() when minAppVersion is below 1.13.0", () => {
            assert.ok(allowed(preDeclarativeSettings).includes("display"));
        });

        it("allows SettingTab#display() when there is no manifest", () => {
            assert.ok(allowed(noManifest).includes("display"));
        });

        it("reports SettingTab#display() from minAppVersion 1.13.0", () => {
            assert.deepStrictEqual(allowed(declarativeSettings), ["caretRangeFromPoint"]);
        });
    });

    it("does not report a missing manifest as a load failure", () => {
        assert.ok(
            !noManifest.stderr.includes("Failed to load JSON file"),
            `unexpected stderr: ${noManifest.stderr}`,
        );
    });
});
