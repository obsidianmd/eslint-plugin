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
    ],
    invalid: [
        {
            name: "localStorage.getItem('language') is forbidden",
            code: "const lang = localStorage.getItem('language');",
            errors: [{ messageId: "localStorageLanguage" }],
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
    ],
});
