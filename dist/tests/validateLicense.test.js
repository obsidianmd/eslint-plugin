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
            name: "copyright with year range ending at current year is valid",
            filename: "LICENSE",
            code: `Copyright (C) 2020-${currentYear} by John Doe`,
        },
        {
            name: "copyright with current year only is valid",
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear} by John Doe`,
        },
        {
            name: "copyright with next year is valid",
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear + 1} by John Doe`,
        },
        {
            name: "copyright matching custom currentYear option is valid",
            filename: "LICENSE",
            code: `Copyright (C) 2000 by John Doe`,
            options: [{ currentYear: 2000, disableUnchangedYear: false }],
        },
        {
            name: "copyright year after custom currentYear is valid",
            filename: "LICENSE",
            code: `Copyright (C) 2001 by John Doe`,
            options: [{ currentYear: 2000, disableUnchangedYear: false }],
        },
        {
            name: "copyright with disableUnchangedYear skips year check",
            filename: "LICENSE",
            code: `Copyright (C) 2001 by John Doe`,
            options: [{ currentYear: currentYear, disableUnchangedYear: true }],
        },
        {
            name: "copyright embedded in other text is valid",
            filename: "LICENSE",
            code: `foo\nCopyright (C) 2020-${currentYear} by John Doe\nbar`,
        },
        {
            name: "file without copyright line is valid",
            filename: "LICENSE",
            code: `foo\nbar\nbaz`,
        },
    ],
    invalid: [
        {
            name: "unchanged Dynalist Inc copyright is forbidden",
            filename: "LICENSE",
            code: `Copyright (C) 2020-${currentYear} by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "outdated year in range is forbidden",
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by John Doe`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } }
            ],
        },
        {
            name: "outdated single year is forbidden",
            filename: "LICENSE",
            code: `Copyright (C) 2022 by John Doe`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } }
            ],
        },
        {
            name: "outdated year and Dynalist both trigger errors",
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "multiple copyright lines each checked independently",
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by John Doe\nCopyright (C) 2020-${currentYear} by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "Dynalist copyright embedded in text is forbidden",
            filename: "LICENSE",
            code: `bar\nCopyright (C) 2020-${currentYear} by Dynalist Inc.\nbaz`,
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "year before custom currentYear is forbidden",
            filename: "LICENSE",
            code: `Copyright (C) 1999 by John Doe`,
            options: [{ currentYear: 2000, disableUnchangedYear: false }],
            errors: [
                { messageId: "unchangedYear", data: { expected: "2000", actual: "1999" } }
            ],
        },
    ],
});
