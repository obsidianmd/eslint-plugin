import type { JSONRuleDefinition } from "@eslint/json/types";
import { docsUrl } from "../../ruleCreator.js";
import {
    createSentenceCaseEvaluator,
    isEnglishLocalePath,
    resolveSentenceCaseConfig,
    SentenceCaseRuleConfig,
} from "./sentenceCaseUtil.js";

// Locale JSON is strict JSON, so it is parsed by `@eslint/json` into a Momoa
// AST (Document -> Object -> Member -> String), not into the ESTree shape the
// other sentence-case rules see. `JSONRuleDefinition` types the visitor
// accordingly.
type SentenceCaseJsonRuleDefinition = JSONRuleDefinition<{
    MessageIds: "useSentenceCase";
    RuleOptions: [SentenceCaseRuleConfig?];
}>;

const rule: SentenceCaseJsonRuleDefinition = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Enforce sentence case for English JSON locale strings",
            url: docsUrl("sentence-case-json", "ui"),
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
    create(context) {
        // Only English locale files hold English UI text.
        if (!isEnglishLocalePath(context.physicalFilename, ["json"])) {
            return {};
        }
        const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);
        const suggestFor = createSentenceCaseEvaluator(evaluatorOptions);

        return {
            // A member's string value is UI text; its key is an identifier.
            // Array elements are Elements, not Members, so they stay skipped.
            Member(member) {
                const value = member.value;
                if (value.type !== "String") {
                    return;
                }
                const suggestion = suggestFor(value.value);
                if (suggestion === undefined) {
                    return;
                }
                context.report({
                    node: value,
                    messageId: "useSentenceCase",
                    data: { suggestion },
                    ...(allowAutoFix
                        ? { fix: (fixer) => fixer.replaceText(value, JSON.stringify(suggestion)) }
                        : {}),
                });
            },
        };
    },
};

export default rule;
