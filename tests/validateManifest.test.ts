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
            options: [{ allowedWords: { id: ["obsidian"] } }],
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
    ],
    invalid: [
        {
            name: "forbidden word 'plugin' in id, name, and description",
            filename: "manifest.json",
            code: `{
                    "id": "my-plugin",
                    "name": "My Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great plugin.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "id" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "name" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "description" },
                },
            ],
        },
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
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "name" },
                },
            ],
        },
        {
            name: "forbidden words 'obsidian' and 'plugin' in name",
            filename: "manifest.json",
            code: `{
                    "id": "my-plugin",
                    "name": "My Obsidian Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great plugin.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "id" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian' or 'plugin", key: "name" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "description" },
                },
            ],
        },
        {
            name: "forbidden words 'obsidian' and 'plugin' in id and description",
            filename: "manifest.json",
            code: `{
                    "id": "my-obsidian-plugin",
                    "name": "My Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great tool for Obsidian.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian' or 'plugin", key: "id" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "name" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian", key: "description" },
                },
            ],
        },
        {
            name: "forbidden word 'PLUGIN' is case insensitive",
            filename: "manifest.json",
            code: `{
                    "id": "my-PLUGIN-tool",
                    "name": "My Tool",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great tool.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "id" },
                },
            ],
        },
        {
            name: "forbidden word 'obsidian' in name",
            filename: "manifest.json",
            code: `{
                    "id": "my-tool",
                    "name": "Obsidian Helper",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great tool.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian", key: "name" },
                },
            ],
        },
        {
            name: "forbidden word 'plugin' matched as substring",
            filename: "manifest.json",
            code: `{
                    "id": "myplugin",
                    "name": "MyPlugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great tool.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "id" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "name" },
                },
            ],
        },
        {
            name: "forbidden word 'obsidian' in description",
            filename: "manifest.json",
            code: `{
                    "id": "my-tool",
                    "name": "My Tool",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "The best obsidian companion.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian", key: "description" },
                },
            ],
        },
        {
            name: "forbidden words 'obsidian' and 'plugin' in description",
            filename: "manifest.json",
            code: `{
                    "id": "my-tool",
                    "name": "My Tool",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "An Obsidian plugin for notes.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian' or 'plugin", key: "description" },
                },
            ],
        },
        {
            name: "array root type is forbidden",
            filename: "manifest.json",
            code: `[]`,
            errors: [{ messageId: "mustBeRootObject" }],
        },
        {
            name: "forbidden word only in id with clean name and description",
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
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian", key: "id" },
                },
            ],
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
            name: "empty fundingUrl object is forbidden",
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
            errors: [
                {
                    messageId: "emptyFundingUrlObject",
                },
            ],
        },
        {
            name: "empty fundingUrl string is forbidden",
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
            errors: [
                {
                    messageId: "emptyFundingUrlObject",
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
            name: "empty fundingUrl entry alongside valid entry is forbidden",
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
            errors: [
                {
                    messageId: "emptyFundingUrlObject",
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
            name: "too short description is forbidden",
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
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "too long description is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "long-description",
                    "name": "Long description",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "I'd just like to interject for a moment. What you're refering to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "description without ending period is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "remove-periods",
                    "name": "Removes all periods from your life",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Even removes them from this sentence",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "all lowercase description is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "all-lowercase",
                    "name": "all lowercase",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "this description is all lowercase. it should be capitalized.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "allowedWords is scoped to the field and word it names",
            filename: "manifest.json",
            code: `{
                    "id": "obsidian-plugin-notes",
                    "name": "Obsidian Notes",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Manage your notes efficiently.",
                    "isDesktopOnly": false
                }`,
            options: [{ allowedWords: { id: ["obsidian"] } }],
            errors: [
                {
                    messageId: "noForbiddenWords",
                    data: { word: "plugin", key: "id" },
                },
                {
                    messageId: "noForbiddenWords",
                    data: { word: "obsidian", key: "name" },
                },
            ],
        },
        {
            name: "ignoring one check leaves the other reporting",
            filename: "manifest.json",
            code: `{
                    "id": "my-plugin",
                    "name": "My Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "Short.",
                    "isDesktopOnly": false
                }`,
            options: [{ ignore: ["noForbiddenWords"] }],
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "description with an invisible character is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "zero-width",
                    "name": "Zero width",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This description hides a zero\\u200bwidth space.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
        {
            name: "description with emojis is forbidden",
            filename: "manifest.json",
            code: `{
                    "id": "emojis-are-my-culture",
                    "name": "Emojis are my culture",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "This description contains emojis 😊, which are not allowed in the description field.",
                    "isDesktopOnly": false
                }`,
            errors: [
                {
                    messageId: "descriptionFormat",
                },
            ],
        },
    ],
});
