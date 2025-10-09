import { RuleTester } from "@typescript-eslint/rule-tester";
import licenseRule from "../lib/rules/validateLicense.js";
import { PlainTextParser } from "lib/plainTextParser.js";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: PlainTextParser,
        parserOptions: {
            extraFileExtensions: [""],
        }
    },

});
const currentYear = new Date().getFullYear();

ruleTester.run("validate-license", licenseRule, {
    valid: [
        {
            filename: "LICENSE",
            code: `Copyright (C) 2020-${currentYear} by John Doe`,
        },
        {
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear} by John Doe`,
        },
        {
            filename: "LICENSE",
            code: `foo\nCopyright (C) 2020-${currentYear} by John Doe\nbar`,
        },
        {
            filename: "LICENSE",
            code: `foo\nbar\nbaz`,
        },
    ],
    invalid: [
        {
            filename: "LICENSE",
            code: `Copyright (C) 2020-${currentYear} by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by John Doe`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } }
            ],
        },
        {
            filename: "LICENSE",
            code: `Copyright (C) 2022 by John Doe`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } }
            ],
        },
        {
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
            {
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by John Doe\nCopyright (C) 2020-${currentYear} by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            filename: "LICENSE",
            code: `bar\nCopyright (C) 2020-${currentYear} by Dynalist Inc.\nbaz`,
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
    ],
});