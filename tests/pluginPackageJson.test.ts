import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, it } from "mocha";
import { readPluginPackageJson } from "../lib/pluginPackageJson.js";

// A checkout inside a project of its own, as in a monorepo or a vault's
// .obsidian/plugins folder: the directory above the checkout has a package.json
// too, which a fixed `../../package.json` from lib/ reached first.
describe("readPluginPackageJson", () => {
    let root: string;
    const moduleUrl = (...segments: string[]) => pathToFileURL(path.join(root, "parent", "checkout", ...segments)).href;

    before(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), "obsidianmd-package-json-"));
        const checkout = path.join(root, "parent", "checkout");
        for (const dir of ["lib/rules", "dist/lib/rules"]) {
            fs.mkdirSync(path.join(checkout, dir), { recursive: true });
        }
        fs.writeFileSync(path.join(root, "parent", "package.json"), JSON.stringify({ name: "parent-project", version: "9.9.9" }));
        fs.writeFileSync(path.join(checkout, "package.json"), JSON.stringify({ name: "eslint-plugin-obsidianmd", version: "1.2.3" }));
    });

    after(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    for (const file of ["lib/index.ts", "lib/rules/noUnsupportedApi.ts", "dist/lib/index.js", "dist/lib/rules/noUnsupportedApi.js"]) {
        it(`finds the plugin's own package.json from ${file}`, () => {
            assert.deepStrictEqual(readPluginPackageJson(moduleUrl(file)), { name: "eslint-plugin-obsidianmd", version: "1.2.3" });
        });
    }

    it("skips a package.json in the build directory that is not the plugin's", () => {
        const distPackageJson = path.join(root, "parent", "checkout", "dist", "package.json");
        fs.writeFileSync(distPackageJson, JSON.stringify({ type: "module" }));
        try {
            assert.deepStrictEqual(readPluginPackageJson(moduleUrl("dist/lib/index.js")), { name: "eslint-plugin-obsidianmd", version: "1.2.3" });
        } finally {
            fs.rmSync(distPackageJson);
        }
    });

    it("is undefined when no package.json above the module is the plugin's", () => {
        const url = pathToFileURL(path.join(root, "parent", "other", "lib", "index.js")).href;
        assert.strictEqual(readPluginPackageJson(url), undefined);
    });

    it("finds this repository's package.json from lib/", () => {
        const own = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { name: string; version: string };
        assert.deepStrictEqual(readPluginPackageJson(new URL("../lib/index.ts", import.meta.url).href), { name: own.name, version: own.version });
    });
});
