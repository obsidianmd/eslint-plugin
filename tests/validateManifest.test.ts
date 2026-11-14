import { RuleTester, type Rule } from "eslint";
import json from "@eslint/json";
import manifestRule from "../lib/rules/validateManifest.js";

// manifest.json is strict JSON, so the rule is exercised through the JSON
// language rather than through a JS/TS parser. Running it through
// @typescript-eslint/parser would test an AST that no real lint run ever
// produces for this file.
const ruleTester = new RuleTester({
    plugins: { json },
    language: "json/json",
});

ruleTester.run("validate-manifest", manifestRule as unknown as Rule.RuleModule, {
    valid: [
        {
            name: "complete valid manifest is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "foo-bar",
                    "name": "Foo bar",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A way to foo bar your life.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
        },
        {
            name: "manifest with string fundingUrl is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": "https://obsidian.md/pricing"
                }`,
        },
        {
            name: "manifest with object fundingUrl is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": "https://patreon.com/test"
                    }
                }`,
        },
        // The review checks only the funding URLs that are there, and an empty
        // URL gives no results, so none of these fail it.
        {
            name: "empty fundingUrl string is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": ""
                }`,
        },
        {
            name: "empty fundingUrl object is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {}
                }`,
        },
        {
            name: "empty fundingUrl entry is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": "https://patreon.com/test",
                        "ko-fi": ""
                    }
                }`,
        },
        {
            name: "valid description is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "valid-description",
                    "name": "Valid description",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This is a valid description.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "description ending with period is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "valid-description-with-periods",
                    "name": "Valid description with periods",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This description ends with a period.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "a file that is not a manifest is ignored",
            filename: "package.json",
            code: `{ "name": "My Plugin" }`,
        },
        {
            // Backticks, em dashes, parentheses, colons and slashes all appear
            // in listings the directory passed untouched.
            name: "ordinary punctuation in a description is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "punctuation",
                    "name": "Punctuation",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Renders \`code\` blocks (inline and fenced) — see docs/readme: it/handles slashes.",
                    "isDesktopOnly": false
                }`,
        },
        {
            // obsidian-tasks-plugin, obsidian-meta-bind-plugin: a published
            // id can never change.
            name: "the id is not checked by default",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-tasks-plugin",
                    "name": "Tasks",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Track tasks across your vault.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "checkId: false does not check the id",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-tasks-plugin",
                    "name": "Tasks",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Track tasks across your vault.",
                    "isDesktopOnly": false
                }`,
            options: [{ checkId: false }],
        },
        {
            name: "allowedWords lets a published id keep a forbidden word",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-notes",
                    "name": "Notes Manager",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Manage your notes efficiently.",
                    "isDesktopOnly": false
                }`,
            options: [{ checkId: true, allowedWords: { id: ["obsidian"] } }],
        },
        {
            // The field is matched case-insensitively, so the allowed words
            // are too: "Obsidian" as written in the config still un-bans it.
            name: "allowedWords is case-insensitive",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-notes",
                    "name": "Obsidian Notes",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Manage your notes efficiently.",
                    "isDesktopOnly": false
                }`,
            options: [{ checkId: true, allowedWords: { id: ["Obsidian"], name: ["OBSIDIAN"] } }],
        },
        {
            name: "ignore skips the forbidden words check entirely",
            filename: "manifest.json",
            code: `{
                    "id": "my-plugin",
                    "name": "My Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great plugin.",
                    "isDesktopOnly": false
                }`,
            options: [{ ignore: ["noForbiddenWords"] }],
        },
        {
            name: "ignore skips the description format check entirely",
            filename: "manifest.json",
            code: `{
                    "id": "short-description",
                    "name": "Short description",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Short.",
                    "isDesktopOnly": false
                }`,
            options: [{ ignore: ["descriptionFormat"] }],
        },
        {
            // Not in the developer docs' manifest reference, but the community scanner
            // accepts it and many published plugins carry it.
            name: "helpUrl is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false,
                    "helpUrl": "https://example.com/docs"
                }`,
        },
        {
            // Only a description referring to itself is reported, not the word.
            name: "a description that mentions plugins is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "hot-reload",
                    "name": "Hot reload",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Automatically reload plugins in development.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "an id that contains 'plugin' without ending with it is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "plugin-manager",
                    "name": "Manager of extensions",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "a description ending with an exclamation mark is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts every word you write!",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "a description ending with a question mark is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Ever wondered how long your notes are?",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "a description starting with a lowercase letter is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "iCloud sync for every vault you open.",
                    "isDesktopOnly": false
                }`,
        },
        {
            // The community scanner does not restrict the characters of a description.
            name: "a description with emoji or a line break is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Track habits ✅ every day.\\nAnd weekly.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "allowedWords 'plugin' accepts an id ending with 'plugin'",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally-plugin",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            options: [{ checkId: true, allowedWords: { id: ["plugin"] } }],
        },
        {
            name: "allowedWords 'obsidian' on the name also accepts its fragments",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsi tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            options: [{ allowedWords: { name: ["obsidian"] } }],
        },
        {
            name: "allowedWords 'plugin' on the description accepts a self-reference",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This plugin counts words in your notes.",
                    "isDesktopOnly": false
                }`,
            options: [{ allowedWords: { description: ["plugin"] } }],
        },
        {
            // The scanner reports a description shorter than 10 characters, not one of 10.
            name: "a description of exactly 10 characters is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts it.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "a description of exactly 250 characters is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts word.",
                    "isDesktopOnly": false
                }`,
        },
        {
            // The scanner trims the description before it looks at its last character.
            name: "a description ending with punctuation and then whitespace is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.  ",
                    "isDesktopOnly": false
                }`,
        },
        {
            // Only a leading "ob" counts as a part of "Obsidian".
            name: "a name containing 'ob' after its start is accepted",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Global search",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
        },
        {
            name: "allowedWords 'plugin' on the name accepts the word",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Plugin manager",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            options: [{ allowedWords: { name: ["plugin"] } }],
        },
        {
            name: "allowedWords 'obsidian' on the description accepts the word",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in Obsidian notes.",
                    "isDesktopOnly": false
                }`,
            options: [{ allowedWords: { description: ["obsidian"] } }],
        },
        {
            // "a plugin to" inside "Agenda plugin to" is not a self-reference.
            name: "a self-reference must start a word",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Syncs the Agenda plugin to your calendar.",
                    "isDesktopOnly": false
                }`,
        },
        {
            // Every description starts with an empty name; that is not reported.
            name: "an empty name is not a prefix of the description",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
        },
    ],
    invalid: [
        {
            name: "missing required keys reports all missing",
            filename: "manifest.json",
            code: `{"name": "My Plugin"}`,
            errors: [
                { messageId: "missingKey", data: { key: "author" } },
                { messageId: "missingKey", data: { key: "minAppVersion" } },
                { messageId: "missingKey", data: { key: "version" } },
                { messageId: "missingKey", data: { key: "id" } },
                { messageId: "missingKey", data: { key: "description" } },
                { messageId: "missingKey", data: { key: "isDesktopOnly" } },
                { messageId: "namePlugin" },
            ],
        },
        {
            name: "an id containing 'obsidian' is reported",
            filename: "manifest.json",
            options: [{ checkId: true }],
            code: `{
                    "id": "obsidian-git",
                    "name": "Git",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "idObsidian" },
            ],
        },
        {
            name: "an id ending with 'plugin' is reported",
            filename: "manifest.json",
            options: [{ checkId: true }],
            code: `{
                    "id": "my-tool-plugin",
                    "name": "My tool",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "idEndsWithPlugin" },
            ],
        },
        {
            name: "an id containing 'obsidian' and ending with 'plugin' reports both",
            filename: "manifest.json",
            options: [{ checkId: true }],
            code: `{
                    "id": "obsidian-tasks-plugin",
                    "name": "Tasks",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "idObsidian" },
                { messageId: "idEndsWithPlugin" },
            ],
        },
        {
            name: "a name containing 'Obsidian' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsidian Notes",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidian" },
            ],
        },
        {
            // A zero-width space, a soft hyphen and a bidi control, written
            // as JSON escapes and as the characters themselves.
            name: "'Obsidian' and 'plugin' split by an invisible character are reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obs\\u200Bidian Notes Plug\u00ADin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note for \u202Eobsidian.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidian" },
                { messageId: "namePlugin" },
                { messageId: "descriptionObsidian" },
            ],
        },
        {
            name: "a name containing a fragment of 'Obsidian' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Notesidian",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidianFragment" },
            ],
        },
        {
            name: "a name starting with 'ob' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obvious tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidianFragment" },
            ],
        },
        {
            name: "a name containing 'Plugin' is reported, case-insensitively",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally PLUGIN",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "namePlugin" },
            ],
        },
        {
            name: "a name containing 'Obsidian' and 'Plugin' reports both",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsidian Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidian" },
                { messageId: "namePlugin" },
            ],
        },
        {
            name: "a description containing 'Obsidian' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in Obsidian notes.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionObsidian" },
            ],
        },
        {
            name: "a description saying 'this plugin' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This plugin counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'a plugin that' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A plugin that counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'the plugin' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "The plugin counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description shorter than 10 characters is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionTooShort" },
            ],
        },
        {
            name: "a description over 250 characters is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionTooLong", data: { length: "251" } },
            ],
        },
        {
            name: "a description without ending punctuation is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionPunctuation" },
            ],
        },
        {
            name: "a description equal to the name is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Counts words fast",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words fast",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionPunctuation" },
                { messageId: "descriptionSameAsName" },
            ],
        },
        {
            name: "a description starting with the name is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Word tally counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionStartsWithName" },
            ],
        },
        {
            name: "allowedWords is scoped to the field and word it names",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-tally",
                    "name": "Obsidian tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            options: [{ checkId: true, allowedWords: { id: ["obsidian"] } }],
            errors: [
                { messageId: "nameObsidian" },
            ],
        },
        {
            name: "ignoring the word checks leaves the description format reporting",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsidian tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts obsidian words",
                    "isDesktopOnly": false
                }`,
            options: [{ ignore: ["noForbiddenWords"] }],
            errors: [
                { messageId: "descriptionPunctuation" },
            ],
        },
        {
            name: "ignoring the description format leaves the word checks reporting",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsidian tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts obsidian words",
                    "isDesktopOnly": false
                }`,
            options: [{ ignore: ["descriptionFormat"] }],
            errors: [
                { messageId: "nameObsidian" },
                { messageId: "descriptionObsidian" },
            ],
        },
        {
            name: "array root type is forbidden",
            filename: "manifest.json",
            code: `[]`,
            errors: [{ messageId: "mustBeRootObject" }],
        },
        {
            name: "unknown key is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "eslintIgnore": true
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "eslintIgnore" },
                },
            ],
        },
        // A key naming an `Object.prototype` member is an unknown key like any
        // other, but a plain-object lookup answers with the inherited member
        // rather than `undefined`. These pin that the own-property check
        // rejects such a key before the lookup runs.
        {
            name: "prototype-named key '__proto__' is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "__proto__": {}
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "__proto__" },
                },
            ],
        },
        {
            name: "prototype-named key 'constructor' is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "constructor": 1
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "constructor" },
                },
            ],
        },
        {
            name: "prototype-named key 'toString' is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "toString": "x"
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "toString" },
                },
            ],
        },
        {
            name: "prototype-named key 'hasOwnProperty' is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "hasOwnProperty": true
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "hasOwnProperty" },
                },
            ],
        },
        {
            name: "empty-string key is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "": 1
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "" },
                },
            ],
        },
        {
            name: "authorUrl with number type is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "authorUrl": 12345
                }`,
            errors: [
                {
                    messageId: "invalidType",
                    data: {
                        key: "authorUrl",
                        expectedType: "string",
                        actualType: "number",
                    },
                },
            ],
        },
        {
            name: "authorUrl with null type is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "authorUrl": null
                }`,
            errors: [
                {
                    messageId: "invalidType",
                    data: {
                        key: "authorUrl",
                        expectedType: "string",
                        actualType: "null",
                    },
                },
            ],
        },
        {
            name: "authorUrl with object type is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "authorUrl": {}
                }`,
            errors: [
                {
                    messageId: "invalidType",
                    data: {
                        key: "authorUrl",
                        expectedType: "string",
                        actualType: "object",
                    },
                },
            ],
        },
        {
            name: "fundingUrl entry with number type is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": 12345
                    }
                }`,
            errors: [
                {
                    messageId: "invalidFundingUrl",
                },
            ],
        },
        {
            name: "fundingUrl array is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": ["https://patreon.com/test"]
                }`,
            errors: [
                {
                    messageId: "invalidType",
                    data: {
                        key: "fundingUrl",
                        expectedType: "string or object",
                        actualType: "array",
                    },
                },
            ],
        },
        {
            name: "fundingUrl entry with number alongside valid entry is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": "https://patreon.com/test",
                        "ko-fi": 12345
                    }
                }`,
            errors: [
                {
                    messageId: "invalidFundingUrl",
                },
            ],
        },
        {
            name: "fundingUrl entry with object type is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": "https://patreon.com/test",
                        "ko-fi": {
                            "url": "https://ko-fi.com/test"
                        }
                    }
                }`,
            errors: [
                {
                    messageId: "invalidFundingUrl",
                },
            ],
        },
        {
            name: "duplicate fundingUrl key is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false,
                    "fundingUrl": {
                        "patreon": "https://patreon.com/test",
                        "patreon": "https://patreon.com/test"
                    }
                }`,
            errors: [
                {
                    messageId: "duplicateKey",
                    data: { key: "patreon" },
                },
            ],
        },
        {
            name: "duplicate manifest key is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "test-id",
                    "name": "Test name",
                    "name": "Test name",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great test.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "duplicateKey",
                    data: { key: "name" },
                },
            ],
        },
        {
            name: "a name containing 'obsi' after its start is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Snobsi notes",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "nameObsidianFragment" },
            ],
        },
        {
            name: "a description saying 'this tool' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This tool counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'this add-on' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This add-on counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'this Obsidian plugin' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This Obsidian plugin counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionObsidian" },
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'a plugin for' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A plugin for counting words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description saying 'an Obsidian plugin to' is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "An Obsidian plugin to count words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionObsidian" },
                { messageId: "descriptionSelfReference" },
            ],
        },
        {
            name: "a description of 9 characters is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Count it.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionTooShort" },
            ],
        },
        {
            name: "a description that is short once trimmed is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "   Counts.    ",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionTooShort" },
            ],
        },
        {
            // The scanner measures the description untrimmed.
            name: "trailing whitespace counts towards the 250 character limit",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts words. Counts word. ",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionTooLong", data: { length: "251" } },
            ],
        },
        {
            name: "a description with punctuation only before its end is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words. Then more",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionPunctuation" },
            ],
        },
        {
            name: "the name and the description are compared trimmed and in any case",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Counts words fast ",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "  counts WORDS fast.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionStartsWithName" },
            ],
        },
        {
            name: "a description equal to the name, ignoring case and whitespace, is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": " Counts words fast. ",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "counts WORDS fast.  ",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "descriptionSameAsName" },
            ],
        },
        {
            name: "a non-string name leaves the description unchecked against it",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": 42,
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "42 counts words.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "invalidType", data: { key: "name", expectedType: "string", actualType: "number" } },
            ],
        },
        {
            name: "a string isDesktopOnly is reported",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": "false"
                }`,
            errors: [
                { messageId: "invalidType", data: { key: "isDesktopOnly", expectedType: "boolean", actualType: "string" } },
            ],
        },
        {
            name: "a non-string id is reported, without the word checks",
            filename: "manifest.json",
            code: `{
                    "id": 12345,
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": false
                }`,
            errors: [
                { messageId: "invalidType", data: { key: "id", expectedType: "string", actualType: "number" } },
            ],
        },
        {
            // The first name would be reported for "Obsidian"; JSON.parse keeps
            // the last one, and so does the rule.
            name: "the word checks use the last of duplicate keys",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Obsidian tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words fast.",
                    "isDesktopOnly": false,
                    "name": "Word tally"
                }`,
            errors: [
                { messageId: "duplicateKey", data: { key: "name" }, line: 9, column: 21, endLine: 9, endColumn: 27 },
            ],
        },
        {
            // The description starts with the first name, but not with the last.
            name: "the description checks use the last of duplicate names",
            filename: "manifest.json",
            code: `{
                    "id": "word-tally",
                    "name": "Counts words",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words fast.",
                    "isDesktopOnly": false,
                    "name": "Word tally"
                }`,
            errors: [
                { messageId: "duplicateKey", data: { key: "name" }, line: 9, column: 21 },
            ],
        },
        {
            // A word or type problem is the value's, an unknown key the key's.
            name: "each problem is reported on the key or value it is about",
            filename: "manifest.json",
            options: [{ checkId: true }],
            code: `{
                    "id": "obsidian-tally",
                    "name": "Word tally",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Counts words in the active note.",
                    "isDesktopOnly": "no",
                    "fundingUrl": { "patreon": 1 },
                    "eslintIgnore": true
                }`,
            errors: [
                { messageId: "idObsidian", line: 2, column: 27, endLine: 2, endColumn: 43 },
                { messageId: "invalidType", line: 8, column: 38, endLine: 8, endColumn: 42 },
                { messageId: "invalidFundingUrl", line: 9, column: 48, endLine: 9, endColumn: 49 },
                { messageId: "disallowedKey", line: 10, column: 21, endLine: 10, endColumn: 35 },
            ],
        },
        {
            name: "a missing key is reported on the root object",
            filename: "manifest.json",
            code: `
                {}`,
            errors: [
                { messageId: "missingKey", data: { key: "author" }, line: 2, column: 17 },
                { messageId: "missingKey" },
                { messageId: "missingKey" },
                { messageId: "missingKey" },
                { messageId: "missingKey" },
                { messageId: "missingKey" },
                { messageId: "missingKey" },
            ],
        },
    ],
});

// Nothing stops a repo from linting manifest.json with `json/json5` instead,
// and there an unquoted key is an Identifier rather than a String. The rule
// has to read those keys too, or every unquoted key looks missing.
const json5RuleTester = new RuleTester({
    plugins: { json },
    language: "json/json5",
});

json5RuleTester.run("validate-manifest (json5)", manifestRule as unknown as Rule.RuleModule, {
    valid: [
        {
            name: "manifest with unquoted keys is accepted",
            filename: "manifest.json",
            code: `{
                    id: "foo-bar",
                    name: "Foo bar",
                    author: "Me",
                    version: "1.0.0",
                    minAppVersion: "1.0.0",
                    description: "A way to foo bar your life.",
                    isDesktopOnly: false,
                    fundingUrl: { patreon: "https://patreon.com/test" },
                }`,
        },
    ],
    invalid: [
        {
            name: "unquoted disallowed key is reported by name",
            filename: "manifest.json",
            code: `{
                    id: "foo-bar",
                    name: "Foo bar",
                    author: "Me",
                    version: "1.0.0",
                    minAppVersion: "1.0.0",
                    description: "A way to foo bar your life.",
                    isDesktopOnly: false,
                    eslintIgnore: true,
                }`,
            errors: [
                {
                    messageId: "disallowedKey",
                    data: { key: "eslintIgnore" },
                },
            ],
        },
        {
            name: "unquoted key duplicating a quoted one is reported",
            filename: "manifest.json",
            code: `{
                    "id": "foo-bar",
                    id: "foo-baz",
                    name: "Foo bar",
                    author: "Me",
                    version: "1.0.0",
                    minAppVersion: "1.0.0",
                    description: "A way to foo bar your life.",
                    isDesktopOnly: false,
                }`,
            errors: [
                {
                    messageId: "duplicateKey",
                    data: { key: "id" },
                },
            ],
        },
        {
            // JSON5 has NaN and Infinity, which have no JSON type to name.
            name: "a NaN value is reported as of unknown type",
            filename: "manifest.json",
            code: `{
                    id: "foo-bar",
                    name: "Foo bar",
                    author: "Me",
                    version: "1.0.0",
                    minAppVersion: "1.0.0",
                    description: "A way to foo bar your life.",
                    isDesktopOnly: NaN,
                }`,
            errors: [
                {
                    messageId: "invalidType",
                    data: { key: "isDesktopOnly", expectedType: "boolean", actualType: "unknown" },
                },
            ],
        },
    ],
});
