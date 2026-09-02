import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions } from "@eslint/core";
import path from "path";
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
// We should check that the year is current and the holder is not "Dynalist Inc."
//
// The marker and the " by " are both optional in practice: the conventional MIT
// line reads "Copyright (c) 2025 Dynalist Inc.", with a lowercase marker and no
// " by ". Requiring the uppercase "(C) ... by" form meant this rule silently
// matched nothing on every repo using the standard MIT text.
const COPYRIGHT_REGEX = /^[ \t]*Copyright (?:\([Cc]\)|©) (\d{4})(?:\s*-\s*(\d{4}))? (?:by )?(.+)$/;

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
                        description: "The current year to validate against.",
                    },
                    disableUnchangedYear: {
                        type: "boolean",
                        description: "If true, do not report errors for unchanged years.",
                        default: false,
                    }
                }
            }
        ],
        messages: {
            unchangedCopyright: "Please change the copyright holder from \"Dynalist Inc.\" to your name.",
            unchangedYear: "Please change the copyright year from {{actual}} to the current year ({{expected}}).",
        },
    },
    create(context) {
        const filename = context.physicalFilename;
        // Matches LICENSE as well as the equally common LICENSE.md / LICENSE.txt.
        if (!/LICENSE(\.(?:md|txt))?$/.test(path.basename(filename))) {
            return {};
        }

        const options = context.options[0] ?? {};
        const currentYear = options.currentYear ?? new Date().getFullYear();
        const disableUnchangedYear = options.disableUnchangedYear ?? false;

        return {
            Line(node) {
                const match = node.value.match(COPYRIGHT_REGEX);
                if (!match) {
                    return;
                }

                const startYear = parseInt(match[1], 10);
                const endYear = match[2] ? parseInt(match[2], 10) : startYear;
                const holder = match[3].trim();

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

                if (holder === "Dynalist Inc.") {
                    context.report({
                        messageId: "unchangedCopyright",
                        loc: node.loc,
                    });
                }
            }
        };
    },
};

export default rule;
