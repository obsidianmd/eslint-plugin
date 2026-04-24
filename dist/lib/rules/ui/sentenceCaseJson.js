import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { createSentenceCaseReporter, getContextFilename, isEnglishLocalePath, resolveSentenceCaseConfig, } from "./sentenceCaseUtil.js";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/${name}.md`);
// Default configuration with no custom options specified
const defaultOptions = [{}];
// Checks if the current file is an English locale JSON file
function isInJsonFile(context) {
    const file = getContextFilename(context);
    return file != null && isEnglishLocalePath(file, ["json"]);
}
export default ruleCreator({
    name: "sentence-case-json",
    meta: {
        type: "suggestion",
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
                    mode: { type: "string", enum: ["loose", "strict"] },
                    brands: { type: "array", items: { type: "string" } },
                    acronyms: { type: "array", items: { type: "string" } },
                    ignoreWords: { type: "array", items: { type: "string" } },
                    ignoreRegex: { type: "array", items: { type: "string" } },
                    allowAutoFix: { type: "boolean" },
                    enforceCamelCaseLower: { type: "boolean" },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            useSentenceCase: "Use sentence case for UI text.",
        },
    },
    defaultOptions,
    create(context) {
        if (!isInJsonFile(context))
            return {};
        const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);
        const reportIfNeeded = createSentenceCaseReporter({
            context,
            evaluatorOptions,
            allowAutoFix,
            messageId: "useSentenceCase"
        });
        return {
            // Check string literals in JSON files
            Literal(node) {
                if (typeof node.value !== "string")
                    return;
                const parent = node.parent;
                if (!parent)
                    return;
                if (parent.type === TSESTree.AST_NODE_TYPES.Property && parent.value === node) {
                    reportIfNeeded(node, node.value);
                }
                else if (parent.type === TSESTree.AST_NODE_TYPES.ArrayExpression) {
                    // Skip array elements for now
                    return;
                }
            },
        };
    },
});
