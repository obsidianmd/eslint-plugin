import assert from "node:assert";
import { Linter, RuleTester, type Rule } from "eslint";
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

// The opening lines of the FSF's licences, verbatim. Their copyright line is the
// FSF's notice on the licence text itself, which a plugin author cannot edit.
const FSF_NOTICE = [
    " Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>",
    " Everyone is permitted to copy and distribute verbatim copies",
    " of this license document, but changing it is not allowed.",
].join("\n");
const GPL_3_0 = `                    GNU GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007\n\n${FSF_NOTICE}\n`;
const AGPL_3_0 = `                    GNU AFFERO GENERAL PUBLIC LICENSE\n                       Version 3, 19 November 2007\n\n${FSF_NOTICE}\n`;
const LGPL_3_0 = `                   GNU LESSER GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007\n\n${FSF_NOTICE}\n`;

// The copyright line of the sample plugin's LICENSE, which the rule exists to
// catch left unedited.
const SAMPLE_LINE = "Copyright (C) 2020-2025 by Dynalist Inc.";

ruleTester.run("validate-license", licenseRule as unknown as Rule.RuleModule, {
    valid: [
        // A line with a holder other than the sample's is not checked at all,
        // whatever its year: the year checks are pinned by the invalid cases
        // with the sample holder.
        {
            name: "own copyright with a range ending in the current year is valid",
            filename: "LICENSE",
            code: `Copyright (C) 2020-${currentYear} by John Doe`,
        },
        {
            name: "own copyright with the current year is valid",
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear} by John Doe`,
        },
        {
            name: "own copyright with next year is valid",
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear + 1} by John Doe`,
        },
        // An author's own notice need not carry the current year, so a past year
        // is not reported: reporting it warned nearly every plugin, and again
        // every 1 January.
        {
            name: "own copyright with a past single year is valid",
            filename: "LICENSE",
            code: `Copyright (c) 2023 Jane Doe`,
        },
        {
            name: "own copyright with a range ending in the past is valid",
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by Jane Doe`,
        },
        {
            name: "own copyright before a custom currentYear is valid",
            filename: "LICENSE",
            code: `Copyright (C) 1999 by John Doe`,
            options: [{ currentYear: 2000, disableUnchangedYear: false }],
        },
        {
            name: "GPL-3.0 licence text is valid",
            filename: "LICENSE",
            code: GPL_3_0,
        },
        {
            name: "AGPL-3.0 licence text is valid",
            filename: "LICENSE",
            code: AGPL_3_0,
        },
        {
            name: "LGPL-3.0 licence text is valid",
            filename: "LICENSE",
            code: LGPL_3_0,
        },
        {
            name: "own copyright with an old year is valid with disableUnchangedYear too",
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
            // ryohma0510/obsidian-note-progressbar: the sample plugin's notice
            // kept as attribution for the code taken from it.
            name: "the sample holder's line next to another holder's is kept attribution, not reported",
            filename: "LICENSE",
            code: [
                "This project contains code under multiple licenses:",
                "=== Original Obsidian Sample Plugin by Dynalist Inc. (ISC License) ===",
                "Copyright (C) 2020-2025 by Dynalist Inc.",
                "",
                "=== Modifications and Additions by Ryoma Kawahara (MIT License) ===",
                "Copyright (c) 2026 Ryoma Kawahara",
            ].join("\n"),
        },
        {
            name: "another holder's line before the sample's counts too",
            filename: "LICENSE",
            code: `${FSF_NOTICE}\nCopyright (C) 2020-2022 by John Doe\nCopyright (C) 2020-2022 by Dynalist Inc.`,
        },
        {
            // "Portions Copyright ..." credits the sample plugin's code, which a
            // fork may keep; only a line that is itself the notice is checked.
            name: "a copyright notice that does not start its line is not checked",
            filename: "LICENSE",
            code: `Portions Copyright (C) 2020-2025 by Dynalist Inc.`,
        },
        {
            name: "a holder that adds to the sample holder is not checked",
            filename: "LICENSE",
            code: `Copyright (c) 2022 Dynalist Inc. and Jane Doe`,
        },
    ],
    invalid: [
        {
            name: "the sample plugin's copyright line reports the holder and the year",
            filename: "LICENSE",
            code: `MIT License\n\n${SAMPLE_LINE}\n`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2025" }, line: 3, column: 1, endLine: 3, endColumn: 41 },
                { messageId: "unchangedCopyright", line: 3, column: 1, endLine: 3, endColumn: 41 },
            ],
        },
        {
            name: "disableUnchangedYear suppresses only the year of the sample line",
            filename: "LICENSE",
            code: SAMPLE_LINE,
            options: [{ disableUnchangedYear: true }],
            errors: [{ messageId: "unchangedCopyright" }],
        },
        {
            name: "a licence file under another name is checked too",
            filename: "COPYING",
            code: `Copyright (C) ${currentYear} by Dynalist Inc.`,
            errors: [{ messageId: "unchangedCopyright" }],
        },
        {
            name: "sample holder with a range ending in the current year reports only the holder",
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
            name: "outdated year and Dynalist both trigger errors",
            filename: "LICENSE",
            code: `Copyright (C) 2020-2022 by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            // The FSF's notice is the licence text's, not another holder of
            // the plugin's copyright.
            name: "the sample holder's line next to the FSF's notice is reported",
            filename: "LICENSE",
            code: `${FSF_NOTICE}\nCopyright (C) 2020-2022 by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" }, line: 4 },
                { messageId: "unchangedCopyright", line: 4 }
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
            name: "sample holder before a custom currentYear reports the year against it",
            filename: "LICENSE",
            code: `Copyright (C) 1999 by Dynalist Inc.`,
            options: [{ currentYear: 2000, disableUnchangedYear: false }],
            errors: [
                { messageId: "unchangedYear", data: { expected: "2000", actual: "1999" } },
                { messageId: "unchangedCopyright" }
            ],
        },
        {
            // A centred heading line, as some licence texts lay it out.
            name: "an indented sample line is checked",
            filename: "LICENSE",
            code: `MIT License\n\n      Copyright (c) 2022 Dynalist Inc.\n\t\tCopyright (c) ${currentYear} Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" }, line: 3 },
                { messageId: "unchangedCopyright", line: 3 },
                { messageId: "unchangedCopyright", line: 4 },
            ],
        },
        {
            name: "a year range with spaces around the dash is read to its end",
            filename: "LICENSE",
            code: `Copyright (C) 2020 - 2022 by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedYear", data: { expected: currentYear.toString(), actual: "2022" } },
                { messageId: "unchangedCopyright" },
            ],
        },
        {
            name: "sample holder with a future year reports only the holder",
            filename: "LICENSE",
            code: `Copyright (C) ${currentYear + 1} by Dynalist Inc.`,
            errors: [
                { messageId: "unchangedCopyright" },
            ],
        },
        {
            name: "trailing whitespace after the sample holder is ignored",
            filename: "LICENSE",
            code: `Copyright (c) ${currentYear} Dynalist Inc.   \n`,
            errors: [
                { messageId: "unchangedCopyright" },
            ],
        },
        {
            name: "sample holder matching a custom currentYear reports only the holder",
            filename: "LICENSE",
            code: `Copyright (C) 2000 by Dynalist Inc.`,
            options: [{ currentYear: 2000 }],
            errors: [
                { messageId: "unchangedCopyright" }
            ],
        },
    ],
});

describe("validate-license options", () => {
    it("rejects a misspelled option instead of ignoring it", () => {
        const linter = new Linter();
        assert.throws(
            () => linter.verify("Copyright (C) 2020 by Dynalist Inc.\n", [{
                files: ["LICENSE"],
                plugins: {
                    obsidianmd: {
                        languages: { "plain-text": PlainTextLanguage },
                        rules: { "validate-license": licenseRule as unknown as Rule.RuleModule },
                    },
                },
                language: "obsidianmd/plain-text",
                rules: { "obsidianmd/validate-license": ["warn", { currentyear: 2026 }] },
            }], "LICENSE"),
            /additional properties/i
        );
    });
});
