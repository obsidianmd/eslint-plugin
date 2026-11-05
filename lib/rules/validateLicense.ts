import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions } from "@eslint/core";
import type {
    PlainTextLanguageOptions,
    PlainTextNode,
    PlainTextRuleVisitor,
    PlainTextSourceCode,
} from "../plainTextLanguage.js";
import { docsUrl } from "../ruleCreator.js";

type MessageIds = "unchangedCopyright" | "unchangedYear";

interface ValidateLicenseOptions {
    currentYear?: number;
    disableUnchangedYear?: boolean;
}

type PlainTextRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = object> =
    CustomRuleDefinitionType<
        {
            LangOptions: PlainTextLanguageOptions;
            Code: PlainTextSourceCode;
            Visitor: PlainTextRuleVisitor;
            Node: PlainTextNode;
        },
        Options
    >;

// We want to parse: Copyright (C) 2020-2025 by Dynalist Inc.
// That is the sample plugin's LICENSE, and the rule exists to catch it left
// unedited: the holder must not be "Dynalist Inc.", and while it still is, the
// year is reported too. A line with any other holder is not checked at all. It
// is either the author's own notice, which need not carry the current year, or
// one that belongs to the licence text itself, such as the FSF's
// "Copyright (C) 2007 Free Software Foundation, Inc." heading every GPL-family
// licence, which the author cannot edit.
//
// The marker and the " by " are both optional in practice: the conventional MIT
// line reads "Copyright (c) 2025 Dynalist Inc.", with a lowercase marker and no
// " by ". Requiring the uppercase "(C) ... by" form meant this rule silently
// matched nothing on every repo using the standard MIT text.
const COPYRIGHT_REGEX = /^[ \t]*Copyright (?:\([Cc]\)|©) (\d{4})(?:\s*-\s*(\d{4}))? (?:by )?(.+)$/;

const SAMPLE_HOLDER = "Dynalist Inc.";

// The holder of the notice on the GPL-family licence texts themselves, which
// says nothing about who holds the copyright of the plugin.
const LICENCE_TEXT_HOLDER = /^Free Software Foundation\b/;

const rule: PlainTextRuleDefinition<{
    MessageIds: MessageIds;
    RuleOptions: [ValidateLicenseOptions?];
}> = {
    meta: {
        type: "problem",
        docs: {
            description: "Validate the structure of copyright notices in LICENSE files for Obsidian plugins.",
            url: docsUrl("validate-license"),
        },
        schema: [
            {
                type: "object",
                properties: {
                    currentYear: {
                        type: "number",
                        description: "The current year to compare an unedited sample-plugin copyright line against.",
                    },
                    disableUnchangedYear: {
                        type: "boolean",
                        description: "If true, do not report the year of an unedited sample-plugin copyright line.",
                    }
                },
                additionalProperties: false,
            }
        ],
        // In meta.defaultOptions rather than as a schema `default`, which
        // ESLint fills in through Ajv and eslint-plugin forbids
        // (no-meta-schema-default). currentYear has no fixed default.
        defaultOptions: [{ disableUnchangedYear: false }],
        messages: {
            unchangedCopyright: "Please change the copyright holder from \"Dynalist Inc.\" to your name.",
            unchangedYear: "Please change the copyright year from {{actual}} to the current year ({{expected}}).",
        },
    },
    create(context) {
        const options = context.options[0] ?? {};
        const currentYear = options.currentYear ?? new Date().getFullYear();
        const disableUnchangedYear = options.disableUnchangedYear ?? false;

        // The sample holder's lines, reported once the whole file is read:
        // next to the author's own copyright line, the sample's is the
        // upstream notice kept as attribution, as a license over code taken
        // from the sample plugin should keep it.
        const sampleLines: Array<{ node: PlainTextNode; endYear: number }> = [];
        let otherHolder = false;

        return {
            Line(node) {
                const match = node.value.match(COPYRIGHT_REGEX);
                if (!match) {
                    return;
                }

                const startYear = parseInt(match[1], 10);
                const endYear = match[2] ? parseInt(match[2], 10) : startYear;
                const holder = match[3].trim();
                if (holder === SAMPLE_HOLDER) {
                    sampleLines.push({ node, endYear });
                } else if (!LICENCE_TEXT_HOLDER.test(holder)) {
                    otherHolder = true;
                }
            },
            "Document:exit"() {
                if (otherHolder) {
                    return;
                }
                for (const { node, endYear } of sampleLines) {
                    if (!disableUnchangedYear && endYear < currentYear) {
                        context.report({
                            messageId: "unchangedYear",
                            loc: node.loc,
                            data: {
                                expected: currentYear.toString(),
                                actual: endYear.toString(),
                            }
                        });
                    }

                    context.report({
                        messageId: "unchangedCopyright",
                        loc: node.loc,
                    });
                }
            },
        };
    },
};

export default rule;
