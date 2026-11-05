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

async function undefinedNames(code: string): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath: "src/main.js" });
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
