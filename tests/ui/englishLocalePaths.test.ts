import assert from "node:assert";
import json from "@eslint/json";
import { ESLint, type Linter } from "eslint";
import plugin from "../../lib/index.js";
import { isEnglishLocalePath } from "../../lib/rules/ui/sentenceCaseUtil.js";

// The locale rules check the path of the file themselves, and
// recommendedWithLocalesEn picks the files to run them on with globs. The two
// must agree: a locale file the globs miss is never checked, and a file the
// globs take that the rule then skips is read for nothing -- for JSON with the
// strict json/json language, so a JSONC file such as env.json with comments
// was a fatal parse error.
const localeNames: [name: string, english: boolean][] = [
    ["en", true],
    ["en-US", true],
    ["en_GB", true],
    ["en.messages", true],
    ["EN", true],
    ["En-gb", true],
    ["english", false],
    ["entries", false],
    ["env", false],
    ["enUS", false],
    ["en-", false],
    ["fr", false],
    ["fr-en", false],
    ["men", false],
];

// Each name as a file and as a directory, at the root and deeper.
function pathsFor(extension: string): [path: string, english: boolean][] {
    return localeNames.flatMap(([name, english]): [string, boolean][] => [
        [`${name}.${extension}`, english],
        [`src/lang/${name}.${extension}`, english],
        [`${name}/common.${extension}`, english],
        [`_locales/${name}/menus/file.${extension}`, english],
    ]);
}

const MODULE_EXTENSIONS = ["ts", "js", "cjs", "mjs"];

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommendedWithLocalesEn });

// calculateConfigForFile() is typed any; it gives undefined for a file no config matches.
async function configFor(path: string): Promise<Linter.Config | undefined> {
    return await eslint.calculateConfigForFile(path) as Linter.Config | undefined;
}

async function runsOn(path: string, ruleId: string): Promise<boolean> {
    const severity = (await configFor(path))?.rules?.[ruleId];
    return Array.isArray(severity) ? severity[0] === 1 : severity === 1;
}

// The paths where the rule's check or the config's globs differ from `english`.
async function disagreements(
    paths: [path: string, english: boolean][],
    extensions: string[],
    ruleId: string,
): Promise<string[]> {
    const wrong: string[] = [];
    for (const [path, english] of paths) {
        const rule = isEnglishLocalePath(path, extensions);
        const globs = await runsOn(path, ruleId);
        if (rule !== english || globs !== english) {
            wrong.push(`${path}: expected ${english}, rule ${rule}, globs ${globs}`);
        }
    }
    return wrong;
}

describe("English locale paths: the rules' check and recommendedWithLocalesEn's globs agree", () => {
    it("for ui/sentence-case-json", async () => {
        assert.deepStrictEqual(await disagreements(pathsFor("json"), ["json"], "obsidianmd/ui/sentence-case-json"), []);
    });

    it("and the JSON files it runs on are read with the JSON language", async () => {
        for (const [path] of pathsFor("json").filter(([, english]) => english)) {
            assert.strictEqual((await configFor(path))?.language, json.languages.json, path);
        }
    });

    for (const extension of MODULE_EXTENSIONS) {
        it(`for ui/sentence-case-locale-module on .${extension}`, async () => {
            assert.deepStrictEqual(
                await disagreements(pathsFor(extension), MODULE_EXTENSIONS, "obsidianmd/ui/sentence-case-locale-module"),
                [],
            );
        });
    }

    it("for extensions neither rule reads", async () => {
        const paths: [string, boolean][] = ["en.tsx", "en.mts", "en/strings.cts", "en.jsonc", "en-US/messages.json5"]
            .map((path) => [path, false]);
        assert.deepStrictEqual(await disagreements(paths, ["json"], "obsidianmd/ui/sentence-case-json"), []);
        assert.deepStrictEqual(
            await disagreements(paths, MODULE_EXTENSIONS, "obsidianmd/ui/sentence-case-locale-module"),
            [],
        );
    });
});
