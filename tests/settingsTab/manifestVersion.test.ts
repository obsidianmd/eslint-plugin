import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { Linter } from "eslint";
import type { Rule } from "eslint";
import { before, describe, it } from "mocha";
import noDeprecatedDisplay from "../../lib/rules/settingsTab/noDeprecatedDisplay.js";
import preferUpdateOverDisplay from "../../lib/rules/settingsTab/preferUpdateOverDisplay.js";
import requireDisplay from "../../lib/rules/settingsTab/requireDisplay.js";

// getManifest() caches at module level and reads manifest.json from the process
// cwd, so the rule tests only ever see this repository's manifest (0.15.0).
// Each case here runs manifestVersion.child.ts in a fresh process whose cwd is
// a temporary directory holding the manifest under test.
const childScript = fileURLToPath(new URL("./manifestVersion.child.ts", import.meta.url));
const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;

interface ChildResult {
    requireDisplay: { unset: string[]; below: string[]; declarative: string[] };
    noDeprecatedDisplay: { unset: string[]; below: string[]; declarative: string[]; invalid: string[] };
    preferUpdateOverDisplay: { unset: string[]; below: string[]; declarative: string[] };
    noProblematicSettingsHeadings: { unset: string[]; other: string[] };
}

async function runWithManifest(manifest: string | null): Promise<ChildResult> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-version-"));
    try {
        if (manifest !== null) {
            fs.writeFileSync(path.join(dir, "manifest.json"), manifest);
        }
        const { stdout } = await promisify(execFile)(
            process.execPath,
            ["--import", tsxLoader, childScript],
            { cwd: dir },
        );
        return JSON.parse(stdout) as ChildResult;
    } finally {
        fs.rmSync(dir, { recursive: true });
    }
}

describe("settings-tab rules: minAppVersion and name from manifest.json", () => {
    let declarative: ChildResult;
    let preDeclarative: ChildResult;
    let malformed: ChildResult;
    let noManifest: ChildResult;

    before(async function () {
        this.timeout(60000);
        [declarative, preDeclarative, malformed, noManifest] = await Promise.all([
            runWithManifest(JSON.stringify({ name: "Word Count", minAppVersion: "1.13.0" })),
            runWithManifest(JSON.stringify({ name: "Word Count", minAppVersion: "1.12.7" })),
            runWithManifest(JSON.stringify({ name: "Word Count", minAppVersion: "1.13" })),
            runWithManifest(null),
        ]);
    });

    describe("require-display", () => {
        it("is quiet when the manifest's minAppVersion is 1.13.0", () => {
            assert.deepStrictEqual(declarative.requireDisplay.unset, []);
        });

        it("reports the manifest's minAppVersion when it is below 1.13.0", () => {
            assert.strictEqual(preDeclarative.requireDisplay.unset.length, 1);
            assert.match(preDeclarative.requireDisplay.unset[0], /^minAppVersion is 1\.12\.7 /);
        });

        it("takes the option over the manifest, both ways", () => {
            assert.strictEqual(declarative.requireDisplay.below.length, 1);
            assert.match(declarative.requireDisplay.below[0], /^minAppVersion is 1\.12\.0 /);
            assert.deepStrictEqual(preDeclarative.requireDisplay.declarative, []);
        });

        it("is quiet when the manifest's minAppVersion is not a full version, or there is no manifest", () => {
            assert.deepStrictEqual(malformed.requireDisplay.unset, []);
            assert.deepStrictEqual(noManifest.requireDisplay.unset, []);
        });

        it("still uses the option when the manifest cannot tell", () => {
            assert.strictEqual(malformed.requireDisplay.below.length, 1);
            assert.strictEqual(noManifest.requireDisplay.below.length, 1);
        });
    });

    describe("no-deprecated-display", () => {
        it("reports the manifest's minAppVersion when it is 1.13.0", () => {
            assert.strictEqual(declarative.noDeprecatedDisplay.unset.length, 1);
            assert.match(declarative.noDeprecatedDisplay.unset[0], /^minAppVersion is 1\.13\.0 /);
        });

        it("is quiet when the manifest's minAppVersion is below 1.13.0", () => {
            assert.deepStrictEqual(preDeclarative.noDeprecatedDisplay.unset, []);
        });

        it("takes the option over the manifest, both ways", () => {
            assert.deepStrictEqual(declarative.noDeprecatedDisplay.below, []);
            assert.strictEqual(preDeclarative.noDeprecatedDisplay.declarative.length, 1);
            assert.match(preDeclarative.noDeprecatedDisplay.declarative[0], /^minAppVersion is 1\.13\.2 /);
        });

        it("does not fall back to the manifest when the option is not a version", () => {
            assert.deepStrictEqual(declarative.noDeprecatedDisplay.invalid, []);
        });

        it("is quiet when the manifest's minAppVersion is not a full version, or there is no manifest", () => {
            assert.deepStrictEqual(malformed.noDeprecatedDisplay.unset, []);
            assert.deepStrictEqual(noManifest.noDeprecatedDisplay.unset, []);
        });
    });

    describe("prefer-update-over-display", () => {
        it("reports when the manifest's minAppVersion is 1.13.0", () => {
            assert.strictEqual(declarative.preferUpdateOverDisplay.unset.length, 1);
        });

        it("is quiet when the manifest's minAppVersion is below 1.13.0", () => {
            assert.deepStrictEqual(preDeclarative.preferUpdateOverDisplay.unset, []);
        });

        it("takes the option over the manifest, both ways", () => {
            assert.deepStrictEqual(declarative.preferUpdateOverDisplay.below, []);
            assert.strictEqual(preDeclarative.preferUpdateOverDisplay.declarative.length, 1);
        });

        it("is quiet when the manifest's minAppVersion is not a full version, or there is no manifest", () => {
            assert.deepStrictEqual(malformed.preferUpdateOverDisplay.unset, []);
            assert.deepStrictEqual(noManifest.preferUpdateOverDisplay.unset, []);
        });
    });

    describe("no-problematic-settings-headings", () => {
        it("takes the plugin name from the manifest", () => {
            assert.deepStrictEqual(declarative.noProblematicSettingsHeadings.unset, [
                "Avoid including the plugin name in settings headings.",
            ]);
        });

        it("takes the pluginName option over the manifest", () => {
            assert.deepStrictEqual(declarative.noProblematicSettingsHeadings.other, []);
        });

        it("checks no plugin name, and does not crash, without a manifest", () => {
            assert.deepStrictEqual(noManifest.noProblematicSettingsHeadings.unset, []);
        });
    });
});

describe("settings-tab rules: the minAppVersion option schema", () => {
    const rules = {
        "require-display": requireDisplay,
        "no-deprecated-display": noDeprecatedDisplay,
        "prefer-update-over-display": preferUpdateOverDisplay,
    } as unknown as Record<string, Rule.RuleModule>;

    function verify(ruleId: string, options: unknown): void {
        new Linter().verify("class MyTab extends PluginSettingTab {}", [
            {
                plugins: { obsidianmd: { rules } },
                rules: { [`obsidianmd/${ruleId}`]: ["error", options] as Linter.RuleEntry },
            },
        ]);
    }

    for (const ruleId of Object.keys(rules)) {
        it(`${ruleId} accepts a minAppVersion string`, () => {
            assert.doesNotThrow(() => verify(ruleId, { minAppVersion: "1.13.0" }));
        });

        it(`${ruleId} rejects an unknown option, such as a misspelt minAppVersion`, () => {
            assert.throws(() => verify(ruleId, { minAppversion: "1.13.0" }), /should NOT have additional properties/);
        });

        it(`${ruleId} rejects a minAppVersion that is not a string`, () => {
            assert.throws(() => verify(ruleId, { minAppVersion: 1.13 }), /should be string/);
        });
    }
});
