import { RuleTester } from "@typescript-eslint/rule-tester";
import regexLookbehindRule from "../lib/rules/regexLookbehind.js";
const ruleTester = new RuleTester();
ruleTester.run("regex-lookbehind", regexLookbehindRule, {
    valid: [
        {
            name: "regex without lookbehind is allowed",
            code: "const re = /foo/;",
            options: [{ isDesktopOnly: false }],
        },
        {
            name: "lookbehind in desktop-only mode is allowed",
            code: "const re = /(?<=foo)bar/;",
            options: [{ isDesktopOnly: true }],
        },
    ],
    invalid: [
        {
            name: "lookbehind in non-desktop mode is forbidden",
            code: "const re = /(?<=foo)bar/;",
            options: [{ isDesktopOnly: false }],
            errors: [{ messageId: "lookbehind" }],
        },
    ],
});
