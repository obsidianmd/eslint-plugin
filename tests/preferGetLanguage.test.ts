import { RuleTester } from "@typescript-eslint/rule-tester";
import preferGetLanguageRule from "../lib/rules/preferGetLanguage.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-get-language", preferGetLanguageRule, {
    valid: [
        {
            name: "getLanguage() is allowed",
            code: "const lang = getLanguage();",
        },
        {
            name: "localStorage.getItem with other key is allowed",
            code: "localStorage.getItem('theme');",
        },
        {
            name: "other object getItem('language') is allowed",
            code: "storage.getItem('language');",
        },
        {
            name: "importing other i18n packages is allowed",
            code: "import i18next from 'i18next';",
        },
        {
            name: "a variable holding the storage is not followed",
            code: "const store = localStorage; store.getItem('language');",
        },
        {
            name: "a dynamic import of the detector is not reported",
            code: "const detector = await import('i18next-browser-languagedetector');",
        },
        {
            name: "another storage method, or getItem without a key, is not reported",
            code: "localStorage.setItem('language', 'en'); localStorage.getItem();",
        },
        {
            name: "another storage on window is not reported",
            code: "const lang = window.sessionStorage.getItem('language');",
        },
        {
            name: "require() of another module, or without an argument, is not reported",
            code: "const i18next = require('i18next'); require();",
        },
        {
            name: "a computed access by a variable is not reported",
            code: `
                const getItem = "key";
                localStorage[getItem]("language");
                function read(localStorage: "sessionStorage") {
                    return window[localStorage].getItem("language");
                }
            `,
        },
    ],
    invalid: [
        {
            name: "localStorage.getItem('language') is forbidden",
            code: "const lang = localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage", line: 1, column: 14, endColumn: 46 }],
        },
        {
            name: "window.localStorage.getItem('language') is forbidden",
            code: "const lang = window.localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage" }],
        },
        {
            name: "importing i18next-browser-languagedetector is forbidden",
            code: "import LanguageDetector from 'i18next-browser-languagedetector';",
            errors: [{ messageId: "i18nextDetector" }],
        },
        {
            name: "require i18next-browser-languagedetector is forbidden",
            code: "const LanguageDetector = require('i18next-browser-languagedetector');",
            errors: [{ messageId: "i18nextDetector" }],
        },
        {
            name: "a computed access with the name spelled out is reported",
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
            code: "const lang = activeWindow.localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage" }],
        },
    ],
});
