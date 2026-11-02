import assert from "node:assert";
import { Linter, type Rule } from "eslint";
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
