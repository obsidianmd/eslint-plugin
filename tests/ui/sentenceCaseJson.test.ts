import { RuleTester, type Rule } from "eslint";
import json from "@eslint/json";
import rule from "../../lib/rules/ui/sentenceCaseJson.js";

// Locale JSON is strict JSON, so the rule is exercised through the JSON
// language, as recommendedWithLocalesEn reads it, rather than through a JS/TS
// parser that no real lint run uses for these files.
const tester = new RuleTester({
    plugins: { json },
    language: "json/json",
});

tester.run("ui-sentence-case-json", rule as unknown as Rule.RuleModule, {
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
        {
            name: "keys are not checked",
            filename: "en.json",
            code: '{"Open Settings":"Open settings"}',
        },
        {
            name: "array elements are skipped",
            filename: "en.json",
            code: '{"items":["Open Settings"]}',
        },
        {
            name: "a string that is the whole document is not a member value",
            filename: "en.json",
            code: '"Open Settings"',
        },
        {
            name: "non-string member values are ignored",
            filename: "en.json",
            code: '{"count":3,"enabled":true,"none":null}',
        },
        {
            name: "a non-English locale file is not checked",
            filename: "fr.json",
            code: '{"open":"Open Settings"}',
        },
        {
            name: "a file that only starts with 'en' is not a locale file",
            filename: "entries.json",
            code: '{"open":"Open Settings"}',
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
        {
            name: "values of nested objects are checked",
            filename: "en.json",
            code: '{"settings":{"title":"Open Settings"}}',
            errors: [{ messageId: "useSentenceCase", line: 1, column: 22 }],
        },
        {
            name: "auto-fix keeps the value a valid JSON string",
            filename: "en.json",
            code: '{"quote":"Say \\"Hello World\\" Now"}',
            output: '{"quote":"Say \\"hello world\\" now"}',
            options: [{ allowAutoFix: true }],
            errors: [{ messageId: "useSentenceCase" }],
        },
    ],
});
