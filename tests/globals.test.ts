import assert from "node:assert";
import { ESLint, type Linter } from "eslint";
import plugin from "../lib/index.js";

// The globals the recommended config declares, checked through the config
// itself: no-undef runs on JavaScript files (it is off for TypeScript, where
// the compiler reports undefined names). This repo's manifest.json is not
// desktop-only, so the Node globals are not declared here;
// manifestFallback.test.ts covers a desktop-only manifest.

// The globals Obsidian defines on each window, as docs/configuration.md lists them.
const OBSIDIAN_GLOBALS = [
    "DomElementInfo",
    "SvgElementInfo",
    "activeDocument",
    "activeWindow",
    "ajax",
    "ajaxPromise",
    "createDiv",
    "createEl",
    "createFragment",
    "createSpan",
    "createSvg",
    "fish",
    "fishAll",
    "isBoolean",
    "nextFrame",
    "ready",
    "sleep",
];

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommended });

async function declaredGlobals(filePath: string): Promise<Linter.Globals> {
    const config = await eslint.calculateConfigForFile(filePath) as Linter.Config;
    return (config.languageOptions?.globals ?? {}) as Linter.Globals;
}

async function undefinedNames(code: string, filePath = "src/main.js"): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath });
    assert.deepStrictEqual(result.messages.filter((m) => m.fatal).map((m) => m.message), []);
    return result.messages.filter((m) => m.ruleId === "no-undef").map((m) => m.message);
}

describe("globals in the recommended config", () => {
    for (const filePath of ["src/main.ts", "src/main.js"]) {
        it(`declares Obsidian's globals, read-only, for ${filePath}`, async () => {
            const declared = await declaredGlobals(filePath);
            for (const name of OBSIDIAN_GLOBALS) {
                assert.strictEqual(declared[name], "readonly", name);
            }
        });

        it(`declares the browser globals and require for ${filePath}`, async () => {
            const declared = await declaredGlobals(filePath);
            for (const name of ["window", "document", "console", "localStorage", "HTMLElement"]) {
                assert.ok(name in declared, name);
                assert.notStrictEqual(declared[name], "off", name);
            }
            assert.strictEqual(declared.require, "readonly");
        });

        it(`does not declare the Node globals for ${filePath} when the manifest is not desktop-only`, async () => {
            const declared = await declaredGlobals(filePath);
            for (const name of ["process", "setImmediate", "__dirname", "Buffer", "NodeJS"]) {
                assert.ok(!(name in declared), name);
            }
        });
    }

    it("no-undef reports none of Obsidian's globals", async () => {
        assert.deepStrictEqual(await undefinedNames(`${OBSIDIAN_GLOBALS.join(";\n")};\n`), []);
    });

    it("no-undef reports none of the browser globals", async () => {
        assert.deepStrictEqual(await undefinedNames("console.log(window, document);\n"), []);
    });

    it("no-global-assign reports an assignment to an Obsidian global", async () => {
        const [result] = await eslint.lintText("createEl = null;\n", { filePath: "src/main.js" });
        assert.deepStrictEqual(
            result.messages.filter((m) => m.ruleId === "no-global-assign").map((m) => m.message),
            ["Read-only global 'createEl' should not be modified."],
        );
    });

    for (const filePath of ["jest.config.js", "scripts/release.mjs", "src/main.test.js", "test/helpers.cjs", "src/main.test.ts"]) {
        it(`declares the Node globals for ${filePath}, which runs in Node, when the manifest is not desktop-only`, async () => {
            const declared = await declaredGlobals(filePath);
            for (const name of ["process", "__dirname", "module", "exports", "Buffer", "NodeJS"]) {
                assert.ok(name in declared, name);
                assert.notStrictEqual(declared[name], "off", name);
            }
        });
    }

    it("no-undef reports no Node globals in a tool config", async () => {
        assert.deepStrictEqual(
            await undefinedNames("module.exports = { root: __dirname, ci: process.env.CI };\n", "jest.config.js"),
            [],
        );
    });

    it("no-undef reports neither module nor exports in a .cjs file, but other Node globals in one that runs in Obsidian", async () => {
        assert.deepStrictEqual(
            await undefinedNames("exports = module.exports = { root: __dirname };\n", "src/helpers.cjs"),
            ["'__dirname' is not defined."],
        );
    });

    it("no-redeclare does not report a browser global's name declared at the top of a .cjs file", async () => {
        const [result] = await eslint.lintText("const { Plugin } = require('obsidian');\nmodule.exports = Plugin;\n", { filePath: "src/main.cjs" });
        assert.deepStrictEqual(result.messages.filter((m) => m.fatal || m.ruleId === "no-redeclare" || m.ruleId === "no-undef"), []);
    });

    it("gives no other language the Node globals, as for an English locale file under test/", async () => {
        const withLocales = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommendedWithLocalesEn });
        const config = await withLocales.calculateConfigForFile("test/locales/en.json") as Linter.Config;
        assert.ok(!("process" in ((config.languageOptions?.globals ?? {}) as Linter.Globals)));
        const [result] = await withLocales.lintText('{ "greeting": "Hello" }\n', { filePath: "test/locales/en.json" });
        assert.deepStrictEqual(result.messages, []);
    });

    it("no-undef reports the Node globals and undefined names", async () => {
        assert.deepStrictEqual(
            await undefinedNames("process.env.NODE_ENV;\nsetImmediate(() => {});\nundefinedGlobal;\n"),
            [
                "'process' is not defined.",
                "'setImmediate' is not defined.",
                "'undefinedGlobal' is not defined.",
            ],
        );
    });
});
