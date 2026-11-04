import assert from "node:assert";
import { ESLint, Linter, type Rule } from "eslint";
import plugin from "../../lib/index.js";
import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import rule from "../../lib/rules/ui/sentenceCaseLocaleModule.js";
import { typedRuleTesterConfig } from "../mocha-setup.js";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

const localeModuleRuleTesterConfig: RuleTesterConfig = {
    languageOptions: {
        parser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
};

RuleTester.resetDefaultConfig();
RuleTester.setDefaultConfig(localeModuleRuleTesterConfig);

try {
    const tester = new RuleTester(localeModuleRuleTesterConfig);

    tester.run("ui-sentence-case-locale-module", rule, {
        valid: [
            {
                name: "sentence case values in default export are allowed",
                filename: "en.ts",
                code: `export default {
          pdf: "Export as PDF",
          github: "Connect to GitHub",
        };`,
            },
            {
                name: "sentence case in named export is allowed",
                filename: "locales/en/module.ts",
                code: `export const enUS = {
          autoReveal: "Enable auto-reveal",
        };`,
            },
            {
                name: "sentence case in as-const variable is allowed",
                filename: "en.ts",
                code: `const strings = {
          open: "Open settings",
        } as const;
        export default strings;`,
            },
            {
                name: "sentence case in array value is allowed",
                filename: "en.ts",
                code: `export default {
          items: ["Open settings"],
        };`,
            },
            {
                name: "URLs and REST in capitals keep their casing",
                filename: "en.ts",
                code: `export default { help: "Visit https://obsidian.md/help", rest: "Use the REST API" };`,
            },
            {
                name: "a non-English locale module is not checked",
                filename: "fr.ts",
                code: `export default { autoReveal: "Enable Auto Reveal" };`,
            },
            {
                name: "an object that is not exported is not checked",
                filename: "en.ts",
                code: `const labels = { autoReveal: "Enable Auto Reveal" }; export const count = 1;`,
            },
            {
                name: "strings in an exported function are not checked",
                filename: "en.ts",
                code: `export function label() { return "Enable Auto Reveal"; }`,
            },
            {
                name: "a template literal with expressions is not checked",
                filename: "en.ts",
                code: "declare const n: number; export default { saved: `Saved ${n} Files` };",
            },
            {
                name: "sentence case in a default export with as const or satisfies is allowed",
                filename: "en.ts",
                code: `export default { autoReveal: "Enable auto-reveal" } as const satisfies Record<string, string>;`,
            },
            {
                name: "a non-English locale module with a type assertion is not checked",
                filename: "fr.ts",
                code: `export default { autoReveal: "Enable Auto Reveal" } satisfies Record<string, string>;`,
            },
            {
                name: "a default-exported array with a type assertion is not checked, as without one",
                filename: "en.ts",
                code: `export default ["Enable Auto Reveal"] as const;`,
            },
            {
                name: "values that are not strings are not checked",
                filename: "en.ts",
                code: `export default { count: 3, on: true, none: null, pattern: /Open Settings/, list: [1, , 2] };`,
            },
            {
                name: "a module re-exported from elsewhere is not checked here",
                filename: "en.ts",
                code: `const strings = { a: "Enable Auto Reveal" }; export { strings } from "./other";`,
            },
            {
                name: "an exported name that is not a top-level object is not checked",
                filename: "en.ts",
                code: `const label = "Enable Auto Reveal"; export { label, missing }; export default label;`,
            },
        ],
        invalid: [
            {
                name: "title case in default export is forbidden",
                filename: "en.ts",
                code: `export default {
          autoReveal: "Enable Auto Reveal",
        };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "auto-fix corrects title case in default export",
                filename: "en.ts",
                code: "export default { label: \"Enable Auto Reveal\" };",
                output: "export default { label: \"Enable auto reveal\" };",
                options: [{ allowAutoFix: true }],
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "title case in as-const variable is forbidden",
                filename: "en.ts",
                code: `const strings = {
          autoReveal: "Enable Auto Reveal",
        } as const;
        export default strings;`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "title case in array value is forbidden",
                filename: "en.ts",
                code: `export default {
          items: ["Enable Auto Reveal"],
        };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "title case in nested named export is forbidden",
                filename: "en.ts",
                code: `export const en = {
          nested: {
            label: "Enable Auto Reveal" as const,
          },
        };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported const object is checked",
                filename: "en-GB.ts",
                code: `const strings = { autoReveal: "Enable Auto Reveal" };
export default strings;`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "an object exported through export { name } is checked",
                filename: "en/strings.ts",
                code: `const strings = { autoReveal: "Enable Auto Reveal" };
export { strings };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported object with satisfies is checked",
                filename: "en.ts",
                code: `export default { a: "Enable Auto Reveal" } satisfies Record<string, string>;`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported object with as const is checked",
                filename: "en.ts",
                code: `export default { a: "Enable Auto Reveal", b: { c: "Open Settings" } } as const;`,
                errors: [{ messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported object with as const satisfies is checked and fixed",
                filename: "en.ts",
                code: `export default { a: "Enable Auto Reveal" } as const satisfies Record<string, string>;`,
                output: `export default { a: "Enable auto reveal" } as const satisfies Record<string, string>;`,
                options: [{ allowAutoFix: true }],
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported object with an angle-bracket type assertion is checked",
                filename: "en.ts",
                code: `export default <const>{ a: "Enable Auto Reveal" };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a parenthesized default-exported object is checked",
                filename: "en.ts",
                code: `export default ({ a: "Enable Auto Reveal" } satisfies Record<string, string>);`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a default-exported variable with a type assertion is checked",
                filename: "en.ts",
                code: `const strings = { a: "Enable Auto Reveal" };
export default strings as Record<string, string>;`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "an angle-bracket type assertion on a variable or named export is checked",
                filename: "en.ts",
                code: `const strings = <const>{ a: "Enable Auto Reveal" };
export default strings;
export const more = <const>{ b: "Open Settings" };`,
                errors: [{ messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }],
            },
            {
                name: "a template literal without expressions is checked and fixed in place",
                filename: "en.ts",
                code: "export default { a: `Enable Auto Reveal` };",
                output: "export default { a: `Enable auto reveal` };",
                options: [{ allowAutoFix: true }],
                errors: [{ messageId: "useSentenceCase", data: { suggestion: "Enable auto reveal" } }],
            },
            {
                name: "an object spread inline and the elements of an array with holes and spreads are checked",
                filename: "en.ts",
                code: `export default { ...{ a: "Enable Auto Reveal" }, list: [, ...more, "Open Settings"] };`,
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "Enable auto reveal" } },
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                ],
            },
            {
                name: "every declarator of an exported declaration and a let or var object are checked",
                filename: "en.ts",
                code: `let first = { a: "Enable Auto Reveal" };
var second = { b: "Open Settings" };
export { first, second as default };
export const third = { c: "Close All Tabs" }, fourth = { d: "Save All Files" };`,
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "Enable auto reveal" }, line: 1 },
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings" }, line: 2 },
                    { messageId: "useSentenceCase", data: { suggestion: "Close all tabs" }, line: 4 },
                    { messageId: "useSentenceCase", data: { suggestion: "Save all files" }, line: 4 },
                ],
            },
            {
                name: "the fix keeps the quotes of the string",
                filename: "en.ts",
                code: `export default { a: 'Say "Open Now" Here' }!;`,
                output: `export default { a: 'Say "open now" here' }!;`,
                options: [{ allowAutoFix: true }],
                errors: [{ messageId: "useSentenceCase", data: { suggestion: 'Say "open now" here' } }],
            },
            {
                name: "JavaScript locale modules are checked too",
                filename: "src/lang/en.mjs",
                code: `export default { a: "Enable Auto Reveal" };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a CommonJS-named locale module is checked too",
                filename: "en/strings.cjs",
                code: `export const strings = { a: "Enable Auto Reveal" };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a plain JavaScript locale module is checked too",
                filename: "en-US.js",
                code: `export default { a: "Enable Auto Reveal" };`,
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "a template literal is judged and fixed on its value, its escapes kept",
                filename: "en.ts",
                code: "export default { a: `Open Settings\\tNow`, b: `Open\\u0020Settings`, c: `Line One\\nLine Two` };",
                output: "export default { a: `Open settings\\tnow`, b: `Open\\u0020settings`, c: `Line one\\nline two` };",
                options: [{ allowAutoFix: true }],
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings\tnow" } },
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                    { messageId: "useSentenceCase", data: { suggestion: "Line one\nline two" } },
                ],
            },
            {
                name: "a string keeps its quotes and escapes",
                filename: "en.ts",
                code: String.raw`export default { a: 'It\'s Open Now', b: "Say \"Open\" Now\n", c: '\u0041pply Settings' };`,
                output: String.raw`export default { a: 'It\'s open now', b: "Say \"open\" now\n", c: '\u0041pply settings' };`,
                options: [{ allowAutoFix: true }],
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "It's open now" } },
                    { messageId: "useSentenceCase", data: { suggestion: 'Say "open" now\n' } },
                    { messageId: "useSentenceCase", data: { suggestion: "Apply settings" } },
                ],
            },
            {
                name: "a letter that has to change but is written as an escape is reported without a fix",
                filename: "en.ts",
                code: String.raw`export default { a: 'Open \u0053ettings', b: ` + "`Open \\x53ettings`" + " };",
                output: null,
                options: [{ allowAutoFix: true }],
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                    { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                ],
            },
            {
                name: "the string itself is reported",
                filename: "en.ts",
                code: `export default { a: "Enable Auto Reveal" };`,
                errors: [{ messageId: "useSentenceCase", line: 1, column: 21, endLine: 1, endColumn: 41 }],
            },
        ],
    });
} finally {
    RuleTester.resetDefaultConfig();
    RuleTester.setDefaultConfig(typedRuleTesterConfig);
}

// The rule tester only matches messageId and data, so the message text itself
// is checked through a plain lint run.
describe("ui-sentence-case-locale-module message", () => {
    it("gives the expected text", () => {
        const messages = new Linter().verify(
            `export default { title: "Open Settings" };`,
            [{
                files: ["**/*.ts"],
                languageOptions: { parser },
                plugins: { obsidianmd: { rules: { "sentence-case-locale-module": rule as unknown as Rule.RuleModule } } },
                rules: { "obsidianmd/sentence-case-locale-module": "warn" },
            }],
            "en.ts",
        );
        assert.deepStrictEqual(
            messages.map((message) => message.message),
            ["Use sentence case for UI text. Expected: 'Open settings'"],
        );
    });
});

// The globs docs/rules/ui/sentence-case-locale-module.md lists for recommendedWithLocalesEn.
describe("sentence-case-locale-module in recommendedWithLocalesEn", () => {
    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommendedWithLocalesEn });
    const severityFor = async (file: string) =>
        (await eslint.calculateConfigForFile(file))?.rules?.["obsidianmd/ui/sentence-case-locale-module"]?.[0];

    for (const file of ["src/lang/en.cjs", "en-GB.ts", "src/en_GB.mjs", "src/lang/en/common.js", "src/lang/en/menus/file.ts"]) {
        it(`runs on ${file}`, async () => {
            assert.strictEqual(await severityFor(file), 1);
        });
    }

    it("does not run on a non-English module", async () => {
        const severity = await severityFor("src/lang/fr.ts");
        assert.ok(severity === undefined || severity === 0);
    });
});
