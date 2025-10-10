import { AST_TOKEN_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import path from "path";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "validate-license",
    meta: {
        type: "problem" as const,
        docs: {
            description: "Validate the structure of copyright notices in LICENSE files for Obsidian plugins.",
            url: "???",
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
    defaultOptions: [{
        currentYear: new Date().getFullYear(),
        disableUnchangedYear: false,
    }],
    create(context, [options]) {
        const filename = context.physicalFilename;
        if (!path.basename(filename).endsWith("LICENSE")) {
            return {};
        }

        return {
            Program(programNode: TSESTree.Program) {
                // We want to parse: Copyright (C) 2020-2025 by Dynalist Inc.
                // We should check that the year is current and the holder is not "Dynalist Inc."

                const copyrightRegex = /^(?: |\t)*Copyright \(C\) (\d{4})(?:-(\d{4}))? by (.+)$/;

                // we rely on our plain text parser to give us tokens as Line tokens
                for (const token of programNode.tokens ?? []) {
                    if (token.type !== AST_TOKEN_TYPES.Line) continue;

                    const match = token.value.match(copyrightRegex);
                    if (match) {
                        const startYear = parseInt(match[1], 10);
                        const endYear = match[2] ? parseInt(match[2], 10) : startYear;
                        const holder = match[3].trim();

                        if (!options.disableUnchangedYear && endYear < options.currentYear) {
                            context.report({
                                messageId: "unchangedYear",
                                loc: token.loc,
                                data: {
                                    expected: options.currentYear.toString(),
                                    actual: endYear.toString(),
                                }
                            });
                        }

                        if (holder === "Dynalist Inc.") {
                            context.report({
                                messageId: "unchangedCopyright",
                                loc: token.loc,
                            });
                        }
                    }
                }
            }
        };
    },
});