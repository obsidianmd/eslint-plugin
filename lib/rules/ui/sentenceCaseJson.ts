import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { ruleCreator } from "../../ruleCreator.js";
import {
    createSentenceCaseReporter,
    getContextFilename,
    isEnglishLocalePath,
    resolveSentenceCaseConfig,
    SentenceCaseRuleOptions,
} from "./sentenceCaseUtil.js";

type MessageId = "useSentenceCase";


// Default configuration with no custom options specified
const defaultOptions: SentenceCaseRuleOptions = [{}] as const;

// Checks if the current file is an English locale JSON file
function isInJsonFile(
    context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>,
): boolean {
    const file = getContextFilename(context);
    return file != null && isEnglishLocalePath(file, ["json"]);
}


export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Enforce sentence case for English JSON locale strings",
            url: "https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/sentence-case-json.md",
        },
        fixable: "code",
        hasSuggestions: false,
        schema: [
            {
                type: "object",
                properties: {
                    mode: {
                        type: "string",
                        enum: ["loose", "strict"],
                        description: "Controls sentence case strictness; loose preserves CamelCase tokens while strict lowercases them.",
                    },
                    brands: {
                        type: "array",
                        items: { type: "string" },
                        description: "Brand names to preserve with their canonical casing.",
                    },
                    acronyms: {
                        type: "array",
                        items: { type: "string" },
                        description: "Acronyms that should remain uppercase.",
                    },
                    ignoreWords: {
                        type: "array",
                        items: { type: "string" },
                        description: "Words to skip when applying sentence case.",
                    },
                    ignoreRegex: {
                        type: "array",
                        items: { type: "string" },
                        description: "Regex patterns for strings to ignore entirely.",
                    },
                    allowAutoFix: {
                        type: "boolean",
                        description: "Whether to enable auto-fixes for sentence case violations.",
                    },
                    enforceCamelCaseLower: {
                        type: "boolean",
                        description: "Whether to force CamelCase/PascalCase tokens to lowercase.",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            useSentenceCase: "Use sentence case for UI text.",
        },
    },
    defaultOptions,
    create(context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>) {
        if (!isInJsonFile(context)) return {};
        const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);

        const reportIfNeeded = createSentenceCaseReporter({
            context,
            evaluatorOptions,
            allowAutoFix,
            messageId: "useSentenceCase"
        });

        return {
            // Check string literals in JSON files
            Literal(node: TSESTree.Literal) {
                if (typeof node.value !== "string") return;
                const parent = node.parent;
                if (!parent) return;
                if (parent.type === TSESTree.AST_NODE_TYPES.Property && parent.value === node) {
                    reportIfNeeded(node, node.value);
                } else if (parent.type === TSESTree.AST_NODE_TYPES.ArrayExpression) {
                    // Skip array elements for now
                    return;
                }
            },
        };
    },
});
