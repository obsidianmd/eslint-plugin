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

function getStringFromNode(node: TSESTree.Node): string | null {
  if (
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression"
  ) {
    return getStringFromNode(node.expression);
  }
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.raw ?? null;
  }
  return null;
}

function isPropertyWithKey(prop: TSESTree.Property, keyName: string): boolean {
  if (prop.key.type === "Identifier") return prop.key.name === keyName;
  if (prop.key.type === "Literal") return prop.key.value === keyName;
  return false;
}

function getPropertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal" && typeof prop.key.value === "string") return prop.key.value;
  return null;
}

function normalizeAttributeName(name: string): string {
  return name.replace(/_/g, "-").replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`).toLowerCase();
}

type ExpressionOrPattern = TSESTree.Property["value"];

function isExpressionNode(node: ExpressionOrPattern): node is TSESTree.Expression {
  return (
    node.type !== "ObjectPattern" &&
    node.type !== "ArrayPattern" &&
    node.type !== "AssignmentPattern"
  );
}

function unwrapExpressionNode(node: ExpressionOrPattern): TSESTree.Expression | null {
  let current: ExpressionOrPattern = node;
  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSNonNullExpression"
  ) {
    current = current.expression;
  }
  return isExpressionNode(current) ? current : null;
}

const METHOD_STRING_ARG_POS: Record<string, number> = {
  setName: 0,
  setDesc: 0,
  setButtonText: 0,
  setTooltip: 0,
  setPlaceholder: 0,
  setText: 0,
  setTitle: 0,
  addRibbonIcon: 1, // tooltip
  addOption: 1, // DropdownComponent.addOption(value, label)
};

const ATTR_TEXT_KEYS = new Set(["aria-label", "aria-description", "title", "placeholder"]);

function inspectCreateElOptions(
  node: TSESTree.Expression,
  report: (target: TSESTree.Node, text: string) => void,
) {
  const unwrapped = unwrapExpressionNode(node);
  if (!unwrapped || unwrapped.type !== "ObjectExpression") return;
  for (const prop of unwrapped.properties) {
    if (prop.type !== "Property") continue;
    const keyName = getPropertyKeyName(prop);
    if (!keyName) continue;
    if (keyName === "text" || keyName === "title") {
      const str = getStringFromNode(prop.value);
      if (str != null) report(prop.value, str);
      continue;
    }
    const valueNode = unwrapExpressionNode(prop.value);
    if (!valueNode) continue;
    if (keyName === "attr" && valueNode.type === "ObjectExpression") {
      for (const attrProp of valueNode.properties) {
        if (attrProp.type !== "Property") continue;
        const attrName = getPropertyKeyName(attrProp);
        if (!attrName) continue;
        const normalized = normalizeAttributeName(attrName);
        if (!ATTR_TEXT_KEYS.has(normalized)) continue;
        const attrValue = getStringFromNode(attrProp.value);
        if (attrValue != null) report(attrProp.value, attrValue);
      }
      continue;
    }
    if (valueNode.type === "ObjectExpression") {
      inspectCreateElOptions(valueNode, report);
    }
  }
}

function visitStatementTree(
  statement: TSESTree.Statement | TSESTree.BlockStatement | null | undefined,
  handleReturn: (node: TSESTree.Expression, value: string) => void,
) {
  if (!statement) return;
  if (statement.type === "BlockStatement") {
    for (const inner of statement.body) visitStatementTree(inner, handleReturn);
    return;
  }
  if (statement.type === "ReturnStatement") {
    if (!statement.argument) return;
    const str = getStringFromNode(statement.argument);
    if (str != null) handleReturn(statement.argument, str);
    return;
  }
  if (statement.type === "IfStatement") {
    visitStatementTree(statement.consequent, handleReturn);
    visitStatementTree(statement.alternate, handleReturn);
    return;
  }
  if (statement.type === "SwitchStatement") {
    for (const switchCase of statement.cases) {
      for (const consequent of switchCase.consequent) {
        visitStatementTree(consequent, handleReturn);
      }
    }
    return;
  }
  if (
    statement.type === "ForStatement" ||
    statement.type === "ForInStatement" ||
    statement.type === "ForOfStatement" ||
    statement.type === "WhileStatement" ||
    statement.type === "DoWhileStatement" ||
    statement.type === "LabeledStatement" ||
    statement.type === "WithStatement"
  ) {
    visitStatementTree(statement.body, handleReturn);
    return;
  }
  if (statement.type === "TryStatement") {
    visitStatementTree(statement.block, handleReturn);
    if (statement.handler) visitStatementTree(statement.handler.body, handleReturn);
    if (statement.finalizer) visitStatementTree(statement.finalizer, handleReturn);
  }
}

export default ruleCreator({
  name: "sentence-case",
  meta: {
    type: "suggestion" as const,
    docs: {
      description:
        "Enforce sentence case for UI strings",
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
    const options = (context.options?.[0] as any) ?? {};
    const evalOpts: EvaluatorOptions = options;
    const allowAutoFix = options.allowAutoFix === true;
    const cache = new Map<string, ReturnType<typeof evaluateSentenceCase>>();

    function reportIfNeeded(node: TSESTree.Node, value: string) {
      const res = cache.get(value) ?? evaluateSentenceCase(value, evalOpts);
      cache.set(value, res);
      if (!res.ok && res.suggestion) {
        const fix = (fixer: any) => fixer.replaceText(node, JSON.stringify(res.suggestion));
        if (process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE === "1") console.debug("ui/sentence-case:", { value, suggestion: res.suggestion });
        const report: any = {
          node,
          messageId: "useSentenceCase",
        };
        if (allowAutoFix) report.fix = fix;
        context.report(report);
      }
    }

    function checkCreateEl(node: TSESTree.CallExpression) {
      // createEl(tag, { text: "...", title: "..." })
      if (node.arguments.length < 2) return;
      const arg = node.arguments[1];
      if (arg.type === "SpreadElement") return;
      inspectCreateElOptions(arg, reportIfNeeded);
    }

    function checkSetAttribute(node: TSESTree.CallExpression) {
      // setAttribute("aria-label", "...")
      if (node.arguments.length < 2) return;
      const nameArg = node.arguments[0];
      const valArg = node.arguments[1];
      const name = getStringFromNode(nameArg);
      const value = getStringFromNode(valArg);
      if (!name || !value) return;
      const normalized = normalizeAttributeName(name);
      if (ATTR_TEXT_KEYS.has(normalized)) {
        reportIfNeeded(valArg, value);
      }
    }

    function checkAddCommand(node: TSESTree.CallExpression) {
      // this.addCommand({ name: "..." })
      if (node.arguments.length < 1) return;
      const arg = node.arguments[0];
      if (arg.type !== "ObjectExpression") return;
      for (const prop of arg.properties) {
        if (prop.type !== "Property") continue;
        if (!isPropertyWithKey(prop, "name")) continue;
        const str = getStringFromNode(prop.value);
        if (str != null) reportIfNeeded(prop.value, str);
      }
    }

    function checkMethodCall(node: TSESTree.CallExpression) {
      const callee = node.callee;
      // Handle bare calls like createEl(...)
      if (callee.type === "Identifier") {
        if (callee.name === "createEl") checkCreateEl(node);
        if (callee.name === "addCommand") checkAddCommand(node);
        return;
      }
      if (callee.type !== "MemberExpression") return;
      if (callee.property.type !== "Identifier") return;
      const name = callee.property.name;
      if (name in METHOD_STRING_ARG_POS) {
        const idx = METHOD_STRING_ARG_POS[name];
        const arg = node.arguments[idx];
        if (!arg || arg.type === "SpreadElement") return;
        const str = getStringFromNode(arg);
        if (str != null) reportIfNeeded(arg, str);
      }

      if (name === "setAttribute") checkSetAttribute(node);
      if (name === "createEl") checkCreateEl(node);
      if (name === "addCommand") checkAddCommand(node);
    }

    function checkGetDisplayTextReturns(node: TSESTree.MethodDefinition) {
      if (node.key.type !== "Identifier" || node.key.name !== "getDisplayText") return;
      const fn = node.value;
      if (!fn || fn.type !== "FunctionExpression" || !fn.body) return;
      visitStatementTree(fn.body, (target, text) => reportIfNeeded(target, text));
    }

    return {
      // new Notice("...")
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type === "Identifier" && node.callee.name === "Notice") {
          const first = node.arguments?.[0];
          if (!first) return;
          const str = getStringFromNode(first);
          if (str != null) reportIfNeeded(first, str);
        }
      },
      // Method calls like setName(), setText(), etc.
      CallExpression: checkMethodCall,
      // Direct property assignments: textContent, innerText, title
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== "MemberExpression" || node.left.property.type !== "Identifier") return;
        const prop = node.left.property.name;
        const normalized = normalizeAttributeName(prop);
        if (
          prop !== "textContent" &&
          prop !== "innerText" &&
          !ATTR_TEXT_KEYS.has(normalized)
        ) {
          return;
        }
        const str = getStringFromNode(node.right);
        if (str != null) reportIfNeeded(node.right, str);
      },
      MethodDefinition: checkGetDisplayTextReturns,
    };
  },
});
