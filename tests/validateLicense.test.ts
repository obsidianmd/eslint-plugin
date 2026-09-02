import { RuleTester, type Rule } from "eslint";
import licenseRule from "../lib/rules/validateLicense.js";
import { PlainTextLanguage } from "../lib/plainTextLanguage.js";

// LICENSE is not code, so the rule is exercised through the plain text language
// rather than through a JS/TS parser -- which is also how the recommended
// config runs it.
const ruleTester = new RuleTester({
    plugins: {
        obsidianmd: {
            languages: { "plain-text": PlainTextLanguage },
        },
    },
    language: "obsidianmd/plain-text",
});

const currentYear = new Date().getFullYear();

ruleTester.run("validate-license", licenseRule as unknown as Rule.RuleModule, {
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
            name: "conventional MIT line with lowercase marker and no 'by' is valid when current",
            filename: "LICENSE",
            code: `Copyright (c) ${currentYear} John Doe`,
        },
        {
            name: "copyright sign marker is valid when current",
            filename: "LICENSE",
            code: `Copyright © ${currentYear} John Doe`,
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
        {
            name: "a file that is not a licence is ignored",
            filename: "NOTICE",
            code: `Copyright (C) 2020 by Dynalist Inc.`,
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
            // This is the line the standard MIT template produces, and the one
            // this repo's own LICENSE carries. The rule used to match nothing
            // here, so it silently passed on every such repo.
            name: "conventional MIT line with lowercase marker and no 'by' is checked",
            filename: "LICENSE",
            code: `Copyright (c) ${currentYear} Dynalist Inc.`,
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "copyright sign marker is checked",
            filename: "LICENSE",
            code: `Copyright © 2022 Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            name: "LICENSE.md is checked",
            filename: "LICENSE.md",
            code: `Copyright (c) ${currentYear} Dynalist Inc.`,
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
            name: "CRLF line endings are handled",
            filename: "LICENSE",
            code: `MIT License\r\n\r\nCopyright (c) 2022 Dynalist Inc.\r\n`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" }, line: 3 },
                { messageId: "unchangedCopyright", line: 3 }
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
