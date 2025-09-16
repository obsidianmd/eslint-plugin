import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { evaluateSentenceCase, EvaluatorOptions } from "./sentenceCaseUtil.js";

const ruleCreator = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/${name}.md`,
);

type Options = [
  Partial<
    EvaluatorOptions & {
      allowAutoFix?: boolean;
    }
  >,
];

function isInJsonFile(context: any): boolean {
  const file = context.physicalFilename ?? context.getFilename?.();
  if (typeof file !== "string") return false;
  const normalized = file.replace(/\\/g, "/");
  if (/(?:^|\/)en([._-].*)?\.json$/i.test(normalized)) return true;
  if (/(?:^|\/)en\/.+\.json$/i.test(normalized)) return true;
  return false;
}

export default ruleCreator({
  name: "sentence-case-json",
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Enforce sentence case for English JSON locale strings",
    },
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
  defaultOptions: [{}],
  create(context) {
    if (!isInJsonFile(context)) return {} as any;
    const options = (context.options?.[0] as any) ?? {};
    const evalOpts: EvaluatorOptions = options;
    const allowAutoFix = options.allowAutoFix === true;
    const cache = new Map<string, ReturnType<typeof evaluateSentenceCase>>();

    function reportIfNeeded(node: TSESTree.Node, value: string) {
      const res = cache.get(value) ?? evaluateSentenceCase(value, evalOpts);
      cache.set(value, res);
      if (!res.ok && res.suggestion) {
        const fix = (fixer: any) => fixer.replaceText(node, JSON.stringify(res.suggestion));
        if (process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE === "1") console.debug("ui/sentence-case-json:", { value, suggestion: res.suggestion });
        const report: any = {
          node,
          messageId: "useSentenceCase",
        };
        if (allowAutoFix) report.fix = fix;
        context.report(report);
      }
    }

    return {
      // Check string literals in JSON files
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== "string") return;
        // Check if this literal is a property value
        const parent = node.parent as TSESTree.Node | undefined;
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
