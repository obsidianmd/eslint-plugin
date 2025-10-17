import { ESLintUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import {
  createSentenceCaseReporter,
  getContextFilename,
  isEnglishLocalePath,
  resolveSentenceCaseConfig,
  SentenceCaseRuleOptions,
} from "./sentenceCaseUtil.js";

type MessageId = "useSentenceCase";

const ruleCreator = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/${name}.md`,
);

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
  name: "sentence-case-json",
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
  create(context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>) {
    if (!isInJsonFile(context)) return {};
    const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);

    const reportIfNeeded = createSentenceCaseReporter({
      context,
      evaluatorOptions,
      allowAutoFix,
      messageId: "useSentenceCase",
      debugLabel: "ui/sentence-case-json",
    });

    return {
      // Check string literals in JSON files
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== "string") return;
        const parent = node.parent;
        if (!parent) return;
        if (parent.type === "Property" && parent.value === node) {
          reportIfNeeded(node, node.value);
        } else if (parent.type === "ArrayExpression") {
          // Skip array elements for now
          return;
        }
      },
    };
  },
});
