import assert from "node:assert";
import json from "@eslint/json";
import tsParser from "@typescript-eslint/parser";
import { ESLint, Linter, type Rule } from "eslint";
import plugin from "../../lib/index.js";
import sentenceCaseJson from "../../lib/rules/ui/sentenceCaseJson.js";
import sentenceCaseLocaleModule from "../../lib/rules/ui/sentenceCaseLocaleModule.js";
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

// Only the part of the path inside the project counts, as for the globs, which
// ESLint matches relative to its cwd: a folder above the project that happens
// to be named "en" does not make every file under it a locale file. A file
// outside cwd is tested on its whole path.
describe("English locale paths are tested inside the project", () => {
    const cases: [file: string, cwd: string | undefined, english: boolean][] = [
        // POSIX
        ["/home/u/en/plugin/src/settings.json", "/home/u/en/plugin", false],
        ["/home/u/en-tools/plugin/src/data.json", "/home/u/en-tools/plugin", false],
        ["/home/u/en.d/plugin/data.json", "/home/u/en.d/plugin/", false],
        ["/home/u/en/plugin/src/lang/en.json", "/home/u/en/plugin", true],
        ["/home/u/en/plugin/locales/en.json", "/home/u/en/plugin", true],
        ["/home/u/en/plugin/en.messages.json", "/home/u/en/plugin", true],
        ["/home/u/en/plugin/en/common.json", "/home/u/en/plugin", true],
        ["/home/u/en/plugin/_locales/en-US/menus.json", "/home/u/en/plugin/", true],
        // The project folder itself named "en" does not count either.
        ["/home/u/en/settings.json", "/home/u/en", false],
        // Outside cwd, including a folder that only starts with cwd's name.
        ["/home/u/en/other/data.json", "/home/u/en/plugin", true],
        ["/home/u/en/plugin-2/data.json", "/home/u/en/plugin", true],
        ["/home/u/other/data.json", "/home/u/en/plugin", false],
        // A relative path, as RuleTester passes it, and no cwd.
        ["src/lang/en.json", "/home/u/en/plugin", true],
        ["src/settings.json", "/home/u/en/plugin", false],
        ["/home/u/en/plugin/src/settings.json", undefined, true],
        // Windows
        ["C:\\Users\\en\\plugin\\src\\settings.json", "C:\\Users\\en\\plugin", false],
        ["C:\\Users\\en-tools\\plugin\\src\\data.json", "C:\\Users\\en-tools\\plugin\\", false],
        ["c:\\users\\en\\plugin\\src\\settings.json", "C:\\Users\\en\\plugin", false],
        ["C:\\Users\\en\\plugin\\src\\lang\\en.json", "C:\\Users\\en\\plugin", true],
        ["C:\\Users\\en\\plugin\\locales\\en-GB\\menus.json", "C:\\Users\\en\\plugin", true],
        ["C:\\Users\\en\\other\\data.json", "C:\\Users\\en\\plugin", true],
        ["D:\\en\\plugin\\data.json", "C:\\Users\\me\\plugin", true],
    ];
    for (const [file, cwd, english] of cases) {
        it(`${file} with cwd ${cwd ?? "unset"} is ${english ? "" : "not "}an English locale file`, () => {
            assert.strictEqual(isEnglishLocalePath(file, ["json"], cwd), english);
        });
    }

    // The rules pass ESLint's cwd.
    function messagesFor(code: string, file: string, cwd: string, isJson: boolean): number {
        const rules = {
            "sentence-case-json": sentenceCaseJson as unknown as Rule.RuleModule,
            "sentence-case-locale-module": sentenceCaseLocaleModule as unknown as Rule.RuleModule,
        };
        const config: Linter.Config[] = isJson
            ? [{ files: ["**/*.json"], language: "json/json", plugins: { json, o: { rules } }, rules: { "o/sentence-case-json": "warn" } }]
            : [{ files: ["**/*.ts"], languageOptions: { parser: tsParser }, plugins: { o: { rules } }, rules: { "o/sentence-case-locale-module": "warn" } }];
        return new Linter({ cwd }).verify(code, config, file).length;
    }

    it("sentence-case-json skips a file under a folder named en above the project", () => {
        assert.strictEqual(messagesFor('{"a":"Open Settings"}', "/home/u/en/plugin/src/settings.json", "/home/u/en/plugin", true), 0);
        assert.strictEqual(messagesFor('{"a":"Open Settings"}', "/home/u/en/plugin/src/lang/en.json", "/home/u/en/plugin", true), 1);
    });

    it("sentence-case-locale-module skips a module under a folder named en-tools above the project", () => {
        const code = 'export default { a: "Open Settings" };';
        assert.strictEqual(messagesFor(code, "/home/u/en-tools/plugin/src/settings.ts", "/home/u/en-tools/plugin", false), 0);
        assert.strictEqual(messagesFor(code, "/home/u/en-tools/plugin/src/lang/en-US.ts", "/home/u/en-tools/plugin", false), 1);
    });
});
