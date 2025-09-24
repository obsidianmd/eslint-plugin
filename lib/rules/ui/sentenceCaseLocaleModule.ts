import { TSESTree, ESLintUtils, TSESLint } from "@typescript-eslint/utils";
import {
  createSentenceCaseReporter,
  getContextFilename,
  isEnglishLocalePath,
  resolveSentenceCaseConfig,
  SentenceCaseRuleOptions,
  unwrapExpression,
} from "./sentenceCaseUtil.js";

type MessageId = "useSentenceCase";

const ruleCreator = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/${name}.md`,
);

// Default configuration with no custom options specified
const defaultOptions: SentenceCaseRuleOptions = [{}] as const;

// Checks if the current file is an English locale TypeScript or JavaScript module
function isEnglishLocaleModule(
  context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>,
): boolean {
  const file = getContextFilename(context);
  return file != null && isEnglishLocalePath(file, ["ts", "js", "cjs", "mjs"]);
}

// Recursively collects all string literals from nested objects and arrays
function collectStringLiterals(
  root: TSESTree.Expression,
  cb: (node: TSESTree.Node, value: string) => void,
) {
  const stack: TSESTree.Node[] = [root];
  while (stack.length > 0) {
    const popped = stack.pop();
    if (!popped) continue;
    const current = unwrapExpression(popped);
    if (!current) continue;
    if (current.type === "Literal") {
      if (typeof current.value === "string") cb(current, current.value);
      continue;
    }
    if (current.type === "TemplateLiteral") {
      if (current.expressions.length === 0) {
        const raw = current.quasis.map((q) => q.value.raw).join("");
        cb(current, raw);
      }
      continue;
    }
    if (current.type === "ObjectExpression") {
      for (const property of current.properties) {
        if (property.type === "Property") {
          const value = property.value;
          stack.push(value);
        } else if (property.type === "SpreadElement") {
          stack.push(property.argument);
        }
      }
      continue;
    }
    if (current.type === "ArrayExpression") {
      for (const element of current.elements) {
        if (!element || element.type === "SpreadElement") continue;
        stack.push(element);
      }
    }
  }
}

export default ruleCreator({
  name: "sentence-case-locale-module",
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Enforce sentence case for English TS/JS locale module strings",
      url: "https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/sentence-case-locale-module.md",
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
    if (!isEnglishLocaleModule(context)) return {};
    const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);
    const varObjects = new Map<string, TSESTree.ObjectExpression>();
    const reportIfNeeded = createSentenceCaseReporter({
      context,
      evaluatorOptions,
      allowAutoFix,
      messageId: "useSentenceCase",
      debugLabel: "ui/sentence-case-locale-module",
    });

    return {
      Program(program: TSESTree.Program) {
        // Track top-level variable declarations that are objects
        for (const stmt of program.body) {
          if (stmt.type === "VariableDeclaration") {
            for (const d of stmt.declarations) {
              if (
                d.id.type === "Identifier" &&
                d.init
              ) {
                const unwrapped = unwrapExpression(d.init);
                if (unwrapped && unwrapped.type === "ObjectExpression") {
                  varObjects.set(d.id.name, unwrapped);
                }
              }
            }
          }
        }
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (!node.declaration) return;
        if (node.declaration.type === "ObjectExpression") {
          collectStringLiterals(node.declaration, (n, v) => reportIfNeeded(n, v));
        } else if (node.declaration.type === "Identifier") {
          const obj = varObjects.get(node.declaration.name);
          if (obj) collectStringLiterals(obj, (n, v) => reportIfNeeded(n, v));
        }
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.declaration && node.declaration.type === "VariableDeclaration") {
          for (const decl of node.declaration.declarations) {
            if (
              decl.init
            ) {
              const unwrapped = unwrapExpression(decl.init);
              if (unwrapped && unwrapped.type === "ObjectExpression") {
                collectStringLiterals(unwrapped, (n, v) => reportIfNeeded(n, v));
              }
            }
          }
        } else if (!node.source && node.specifiers && node.specifiers.length > 0) {
          for (const spec of node.specifiers) {
            if (spec.type === "ExportSpecifier" && spec.local.type === "Identifier") {
              const obj = varObjects.get(spec.local.name);
              if (obj) collectStringLiterals(obj, (n, v) => reportIfNeeded(n, v));
            }
          }
        }
      },
    };
  },
});
