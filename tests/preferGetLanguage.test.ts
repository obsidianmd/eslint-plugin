import { RuleTester } from "@typescript-eslint/rule-tester";
import preferGetLanguageRule from "../lib/rules/preferGetLanguage.js";

const ruleTester = new RuleTester();

// getLanguage() came with Obsidian 1.8.7. This repo's manifest.json says
// 0.15.0, below which nothing is reported, so the version is given as an
// option.
const since = [{ minAppVersion: "1.8.7" }] as const;

ruleTester.run("prefer-get-language", preferGetLanguageRule, {
    valid: [
        {
            name: "getLanguage() is allowed",
            options: since,
            code: "const lang = getLanguage();",
        },
        {
            name: "localStorage.getItem with other key is allowed",
            options: since,
            code: "localStorage.getItem('theme');",
        },
        {
            name: "other object getItem('language') is allowed",
            options: since,
            code: "storage.getItem('language');",
        },
        {
            name: "importing other i18n packages is allowed",
            options: since,
            code: "import i18next from 'i18next';",
        },
        {
            name: "a variable holding the storage is not followed",
            options: since,
            code: "const store = localStorage; store.getItem('language');",
        },
        {
            name: "a dynamic import of the detector is not reported",
            options: since,
            code: "const detector = await import('i18next-browser-languagedetector');",
        },
        {
            name: "another storage method, or getItem without a key, is not reported",
            options: since,
            code: "localStorage.setItem('language', 'en'); localStorage.getItem();",
        },
        {
            name: "another storage on window is not reported",
            options: since,
            code: "const lang = window.sessionStorage.getItem('language');",
        },
        {
            name: "require() of another module, or without an argument, is not reported",
            options: since,
            code: "const i18next = require('i18next'); require();",
        },
        {
            name: "a computed access by a variable is not reported",
            options: since,
            code: `
                const getItem = "key";
                localStorage[getItem]("language");
                function read(localStorage: "sessionStorage") {
                    return window[localStorage].getItem("language");
                }
            `,
        },
        {
            // obsidian-kanban, style-settings, periodic-notes: below 1.8.7,
            // reading localStorage is the only way to get the language.
            name: "below 1.8.7, as this repo's manifest.json (0.15.0) is, nothing is reported",
            code: "const lang = localStorage.getItem('language'); import LanguageDetector from 'i18next-browser-languagedetector';",
        },
        {
            name: "below 1.8.7 by the option",
            code: "const lang = window.localStorage.getItem('language');",
            options: [{ minAppVersion: "1.8.6" }],
        },
    ],
    invalid: [
        {
            name: "localStorage.getItem('language') is forbidden",
            options: since,
            code: "const lang = localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage", line: 1, column: 14, endColumn: 46 }],
        },
        {
            name: "window.localStorage.getItem('language') is forbidden",
            options: since,
            code: "const lang = window.localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage" }],
        },
        {
            name: "importing i18next-browser-languagedetector is forbidden",
            options: since,
            code: "import LanguageDetector from 'i18next-browser-languagedetector';",
            errors: [{ messageId: "i18nextDetector" }],
        },
        {
            name: "require i18next-browser-languagedetector is forbidden",
            options: since,
            code: "const LanguageDetector = require('i18next-browser-languagedetector');",
            errors: [{ messageId: "i18nextDetector" }],
        },
        {
            name: "a computed access with the name spelled out is reported",
            options: since,
            code: `
                localStorage["getItem"]("language");
                localStorage[\`getItem\`]("language");
                window["localStorage"].getItem("language");
            `,
            errors: [
                { messageId: "localStorageLanguage", line: 2 },
                { messageId: "localStorageLanguage", line: 3 },
                { messageId: "localStorageLanguage", line: 4 },
            ],
        },
        {
            name: "another window's localStorage is reported",
            options: since,
            code: "const lang = activeWindow.localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage" }],
        },
    ],
});

// The suggestion.
const offered = (output: string) => [{ messageId: "useGetLanguage" as const, output }];

ruleTester.run("prefer-get-language suggestions", preferGetLanguageRule, {
    valid: [],
    invalid: [
        {
            name: "getLanguage is added to the import from obsidian",
            code: 'import { Plugin } from "obsidian";\nexport const lang = localStorage.getItem("language");\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import { Plugin, getLanguage } from "obsidian";\nexport const lang = getLanguage();\n'),
            }],
        },
        {
            name: "a multi-line import gets a line of its own, keeping the trailing comma",
            code: 'import {\n    Notice,\n    Plugin,\n} from "obsidian";\nexport const lang = window.localStorage.getItem("language");\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import {\n    Notice,\n    Plugin,\n    getLanguage,\n} from "obsidian";\nexport const lang = getLanguage();\n'),
            }],
        },
        {
            name: "CRLF line endings are kept",
            code: 'import {\r\n    Notice,\r\n    Plugin\r\n} from "obsidian";\r\nexport const lang = localStorage.getItem("language");\r\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import {\r\n    Notice,\r\n    Plugin,\r\n    getLanguage\r\n} from "obsidian";\r\nexport const lang = getLanguage();\r\n'),
            }],
        },
        {
            name: "getLanguage already imported is used as it is",
            code: 'import { getLanguage, Plugin } from "obsidian";\nexport const a = getLanguage();\nexport const b = localStorage.getItem("language");\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import { getLanguage, Plugin } from "obsidian";\nexport const a = getLanguage();\nexport const b = getLanguage();\n'),
            }],
        },
        {
            name: "an inline type import is a place for it too",
            code: 'import { type App } from "obsidian";\nexport function lang(app: App) { return app && localStorage.getItem("language"); }\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import { type App, getLanguage } from "obsidian";\nexport function lang(app: App) { return app && getLanguage(); }\n'),
            }],
        },
        {
            name: "?. after the call, and parentheses around it, are kept",
            code: 'import { Plugin } from "obsidian";\nexport const lang = (window.localStorage?.getItem("language"))?.split("-")[0];\nexport const p = Plugin;\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import { Plugin, getLanguage } from "obsidian";\nexport const lang = (getLanguage())?.split("-")[0];\nexport const p = Plugin;\n'),
            }],
        },
        {
            name: "a computed access is replaced whole",
            code: 'import { Plugin } from "obsidian";\nexport const lang = activeWindow["localStorage"]["getItem"]("language");\nexport const p = Plugin;\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import { Plugin, getLanguage } from "obsidian";\nexport const lang = getLanguage();\nexport const p = Plugin;\n'),
            }],
        },
        {
            name: "a minAppVersion that is not a version: the suggestion says what it needs",
            code: 'import { Plugin } from "obsidian";\nexport const lang = localStorage.getItem("language");\n',
            options: [{ minAppVersion: "latest" }],
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: [{
                    messageId: "useGetLanguageSince",
                    data: { since: "1.8.7" },
                    output: 'import { Plugin, getLanguage } from "obsidian";\nexport const lang = getLanguage();\n',
                }],
            }],
        },
        // Nothing is offered:
        {
            name: "where getLanguage is imported under another name",
            code: 'import { getLanguage as obsidianLanguage } from "obsidian";\nexport const lang = localStorage.getItem("language") ?? obsidianLanguage();\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
        {
            name: "where a function of the plugin is named getLanguage",
            code: 'import { Plugin } from "obsidian";\nexport function getLanguage() { return localStorage.getItem("language") ?? "en"; }\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
        {
            name: "where a parameter shadows the imported getLanguage",
            code: 'import { getLanguage } from "obsidian";\nexport function lang(getLanguage: () => string) { return getLanguage() || localStorage.getItem("language"); }\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
        {
            name: "where dropping the storage or an argument would drop a call, or a comment is inside",
            code: 'import { Plugin } from "obsidian";\ndeclare function getWindow(): Window;\nexport const a = getWindow().localStorage.getItem("language");\nexport const b = localStorage.getItem(/* key */ "language");\nexport const p = Plugin;\n',
            options: since,
            errors: [
                { messageId: "localStorageLanguage", suggestions: [] },
                { messageId: "localStorageLanguage", suggestions: [] },
            ],
        },
        {
            name: "the detector import gets no suggestion",
            code: "import LanguageDetector from 'i18next-browser-languagedetector';",
            options: since,
            errors: [{ messageId: "i18nextDetector", suggestions: [] }],
        },
    ],
});

// A file with no import from obsidian gets one after its last import. The
// project has the obsidian typings in its program, as a plugin's does.
const obsidianProjectRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/obsidian-project` },
    },
});

obsidianProjectRuleTester.run("prefer-get-language suggestions that add an import", preferGetLanguageRule, {
    valid: [],
    invalid: [
        {
            name: "after the last import, in its quotes and with its semicolon",
            code: "import { a } from './a';\nimport b from './b'\nexport const lang = localStorage.getItem('language') ?? a ?? b;\n",
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered("import { a } from './a';\nimport b from './b'\nimport { getLanguage } from 'obsidian'\nexport const lang = getLanguage() ?? a ?? b;\n"),
            }],
        },
        {
            name: "after a comment that ends the line of the last import",
            code: 'import "./styles.css"; // the plugin\'s styles\nexport const lang = localStorage.getItem("language");\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import "./styles.css"; // the plugin\'s styles\nimport { getLanguage } from "obsidian";\nexport const lang = getLanguage();\n'),
            }],
        },
        {
            name: "a type-only import from obsidian takes no value: a new import, with CRLF",
            code: 'import type { App } from "obsidian";\r\nexport function lang(app: App) { return app && localStorage.getItem("language"); }\r\n',
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered('import type { App } from "obsidian";\r\nimport { getLanguage } from "obsidian";\r\nexport function lang(app: App) { return app && getLanguage(); }\r\n'),
            }],
        },
        {
            name: "nothing is offered in a file with no import, such as a CommonJS file",
            code: 'const obsidian = require("obsidian");\nexports.lang = localStorage.getItem("language") ?? obsidian;\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
    ],
});

// Typings from before getLanguage(): "obsidian" is a stub without it.
const oldObsidianRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/old-obsidian` },
    },
});

oldObsidianRuleTester.run("prefer-get-language with obsidian typings older than 1.8.7", preferGetLanguageRule, {
    valid: [],
    invalid: [
        {
            name: "nothing is offered, with or without an import from obsidian",
            code: 'import { Plugin } from "obsidian";\nexport const lang = localStorage.getItem("language");\nexport const p = Plugin;\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
        {
            name: "nothing is offered where the import would be added",
            code: 'import { a } from "./a";\nexport const lang = localStorage.getItem("language") ?? a;\n',
            options: since,
            errors: [{ messageId: "localStorageLanguage", suggestions: [] }],
        },
    ],
});

// A JavaScript file, without type information.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("prefer-get-language in a JavaScript file", preferGetLanguageRule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion is offered",
            filename: "main.js",
            code: "import { Plugin } from 'obsidian';\nexport default class P extends Plugin { lang() { return localStorage.getItem('language'); } }\n",
            options: since,
            errors: [{
                messageId: "localStorageLanguage",
                suggestions: offered("import { Plugin, getLanguage } from 'obsidian';\nexport default class P extends Plugin { lang() { return getLanguage(); } }\n"),
            }],
        },
    ],
});
