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
            name: "a JSONC locale file is not checked",
            filename: "en.jsonc",
            code: '{"open":"Open Settings"}',
        },
        {
            name: "a file that only starts with 'en' is not a locale file",
            filename: "entries.json",
            code: '{"open":"Open Settings"}',
        },
        {
            name: "URLs, date formats and REST in capitals keep their casing",
            filename: "en.json",
            // Capitals in the URL and a date mid-sentence: right after a colon
            // the first word may take any case, so "Format: YYYY-MM-DD" passed
            // without the date being protected.
            code: '{"help":"Visit https://example.com/Help","date":"Dates look like YYYY-MM-DD","rest":"Use the REST API"}',
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
        {
            name: "auto-fix keeps every escape as written",
            filename: "en.json",
            code: String.raw`{"a":"\u004fpen Settings\nNow","b":"Open\/Close All","c":"Say \"Hi\" \u00e9 Now"}`,
            output: String.raw`{"a":"\u004fpen settings\nnow","b":"Open\/close all","c":"Say \"hi\" \u00e9 now"}`,
            options: [{ allowAutoFix: true }],
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open settings\nnow" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open/close all" } },
                { messageId: "useSentenceCase", data: { suggestion: 'Say "hi" \u00e9 now' } },
            ],
        },
        {
            name: "a letter that has to change but is written as an escape is reported without a fix",
            filename: "en.json",
            code: String.raw`{"a":"Open \u0053ettings"}`,
            output: null,
            options: [{ allowAutoFix: true }],
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "a value in a nested locale directory with a region is checked, and reported where it is",
            filename: "_locales/en_GB/menus.json",
            code: '{\n  "a": "Open Settings",\n  "b": "Close All"\n}',
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" }, line: 2, column: 8, endLine: 2, endColumn: 23 },
                { messageId: "useSentenceCase", data: { suggestion: "Close all" }, line: 3, column: 8, endLine: 3, endColumn: 19 },
            ],
        },
        {
            name: "the message gives the expected text",
            filename: "en.json",
            code: '{"title":"Open Settings"}',
            errors: [{ message: "Use sentence case for UI text. Expected: 'Open settings'" }],
        },
    ],
});
