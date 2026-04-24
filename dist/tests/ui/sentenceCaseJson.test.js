import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import rule from "../../lib/rules/ui/sentenceCaseJson.js";
import { typedRuleTesterConfig } from "../mocha-setup.js";
const jsonRuleTesterConfig = {
    languageOptions: {
        parser,
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: {
            extraFileExtensions: [".json"],
        },
    },
};
RuleTester.resetDefaultConfig();
RuleTester.setDefaultConfig(jsonRuleTesterConfig);
try {
    const tester = new RuleTester(jsonRuleTesterConfig);
    tester.run("ui-sentence-case-json", rule, {
        valid: [
            {
                name: "sentence case values in en.json are allowed",
                filename: "en.json",
                code: '{"label":"Enable auto-reveal","save":"Save to Google Drive","pdf":"Export as PDF"}',
            },
            {
                name: "sentence case values in en-US.json are allowed",
                filename: "en-US.json",
                code: '{"github":"Connect to GitHub","ok":"OK"}',
            },
            {
                name: "backtick and html content in en.json are allowed",
                filename: "en.json",
                code: '{"code":"`Enable Auto-Reveal`","html":"<b>Enable Auto-Reveal</b>","msg":"Hello, ${name}!"}',
            },
            {
                name: "nested locale path is allowed",
                filename: "locales/en/common.json",
                code: '{"open":"Open settings"}',
            },
        ],
        invalid: [
            {
                name: "title case value in en.json is forbidden",
                filename: "en.json",
                code: '{"label":"Enable Auto-Reveal"}',
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "auto-fix corrects title case in en.json",
                filename: "en.json",
                code: '{"label":"Enable Auto-Reveal"}',
                output: '{"label":"Enable auto-reveal"}',
                options: [{ allowAutoFix: true }],
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "title case preposition in en-US.json is forbidden",
                filename: "en-US.json",
                code: '{"save":"Save To Google Drive"}',
                errors: [{ messageId: "useSentenceCase" }],
            },
            {
                name: "title case in nested locale path is forbidden",
                filename: "locales/en/common.json",
                code: '{"open":"Open Settings"}',
                errors: [{ messageId: "useSentenceCase" }],
            },
        ],
    });
}
finally {
    RuleTester.resetDefaultConfig();
    RuleTester.setDefaultConfig(typedRuleTesterConfig);
}
