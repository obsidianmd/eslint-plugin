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

    before(async function () {
        this.timeout(60000);
        [desktopOnly, stringFalse, noManifest] = await Promise.all([
            runWithManifest(JSON.stringify({ isDesktopOnly: true })),
            runWithManifest(JSON.stringify({ isDesktopOnly: "false" })),
            runWithManifest(null),
        ]);
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

    it("does not report a missing manifest as a load failure", () => {
        assert.ok(
            !noManifest.stderr.includes("Failed to load JSON file"),
            `unexpected stderr: ${noManifest.stderr}`,
        );
    });
});
