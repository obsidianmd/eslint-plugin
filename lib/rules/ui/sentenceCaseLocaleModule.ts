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

function isEnglishLocaleModule(context: any): boolean {
  const file = context.physicalFilename ?? context.getFilename?.();
  if (typeof file !== "string") return false;
  const normalized = file.replace(/\\/g, "/");
  if (/(?:^|\/)en([._-].*)?\.(ts|js|cjs|mjs)$/i.test(normalized)) return true;
  if (/(?:^|\/)en\/.+\.(ts|js|cjs|mjs)$/i.test(normalized)) return true;
  return false;
}

type ExpressionOrPattern = TSESTree.Property["value"] | TSESTree.Expression;

function isExpressionNode(node: ExpressionOrPattern): node is TSESTree.Expression {
  return (
    node.type !== "ObjectPattern" &&
    node.type !== "ArrayPattern" &&
    node.type !== "AssignmentPattern"
  );
}

function unwrapExpression(expression: ExpressionOrPattern): TSESTree.Expression | null {
  let current: ExpressionOrPattern = expression;
  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSNonNullExpression"
  ) {
    current = current.expression;
  }
  return isExpressionNode(current) ? current : null;
}

function collectStringLiterals(
  root: TSESTree.Expression,
  cb: (node: TSESTree.Node, value: string) => void,
) {
  const stack: ExpressionOrPattern[] = [root];
  while (stack.length > 0) {
    const popped = stack.pop()!;
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
    if (!isEnglishLocaleModule(context)) return {};
    const options = (context.options?.[0] as any) ?? {};
    const evalOpts: EvaluatorOptions = options;
    const allowAutoFix = options.allowAutoFix === true;
    const varObjects = new Map<string, TSESTree.ObjectExpression>();
    const cache = new Map<string, ReturnType<typeof evaluateSentenceCase>>();

    function reportIfNeeded(node: TSESTree.Node, value: string) {
      const res = cache.get(value) ?? evaluateSentenceCase(value, evalOpts);
      cache.set(value, res);
      if (!res.ok && res.suggestion) {
        const fix = (fixer: any) => fixer.replaceText(node, JSON.stringify(res.suggestion));
        const report: any = {
          node,
          messageId: "useSentenceCase",
        };
        if (allowAutoFix) report.fix = fix;
        context.report(report);
      }
    }

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
