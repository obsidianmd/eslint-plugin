import { TSESTree, ESLintUtils, TSESLint } from "@typescript-eslint/utils";
import {
  createSentenceCaseReporter,
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

// Extracts string value from AST nodes, unwrapping TypeScript type assertions
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

// Checks if an object property has a specific key name
function isPropertyWithKey(prop: TSESTree.Property, keyName: string): boolean {
  if (prop.key.type === "Identifier") return prop.key.name === keyName;
  if (prop.key.type === "Literal") return prop.key.value === keyName;
  return false;
}

// Retrieves the key name from an object property node
function getPropertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal" && typeof prop.key.value === "string") return prop.key.value;
  return null;
}

// Converts attribute names to kebab-case (e.g., "ariaLabel" -> "aria-label")
function normalizeAttributeName(name: string): string {
  return name.replace(/_/g, "-").replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`).toLowerCase();
}

// Encodes a JavaScript string literal with proper escape sequences and quote handling
function encodeStringLiteral(value: string, quote: "'" | "\""): string {
  let result = quote;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    switch (ch) {
      case quote:
        result += `\\${quote}`;
        break;
      case "\\":
        result += "\\\\";
        break;
      case "\n":
        result += "\\n";
        break;
      case "\r":
        result += "\\r";
        break;
      case "\t":
        result += "\\t";
        break;
      case "\b":
        result += "\\b";
        break;
      case "\f":
        result += "\\f";
        break;
      case "\v":
        result += "\\v";
        break;
      case "\0": {
        const next = value.charCodeAt(i + 1);
        if (Number.isFinite(next) && next >= 48 && next <= 57) {
          result += "\\x00";
        } else {
          result += "\\0";
        }
        break;
      }
      default: {
        const code = ch.charCodeAt(0);
        if (code === 0x2028 || code === 0x2029) {
          result += `\\u${code.toString(16).padStart(4, "0")}`;
        } else if (code < 0x20) {
          result += `\\x${code.toString(16).padStart(2, "0")}`;
        } else {
          result += ch;
        }
      }
    }
  }
  result += quote;
  return result;
}
// Maps method names to the position of their text argument
const METHOD_STRING_ARG_POS: Record<string, number> = {
  setName: 0,
  setDesc: 0,
  setButtonText: 0,
  setTooltip: 0,
  setPlaceholder: 0,
  setText: 0,
  setTitle: 0,
  addRibbonIcon: 1, // tooltip is second argument
  addOption: 1, // DropdownComponent.addOption(value, label) - label is second
};

// HTML attributes that contain user-facing text
const ATTR_TEXT_KEYS = new Set(["aria-label", "aria-description", "title", "placeholder"]);

// Recursively inspects createEl options object for text properties
function inspectCreateElOptions(
  node: TSESTree.Expression,
  report: (target: TSESTree.Node, text: string) => void,
) {
  const unwrapped = unwrapExpression(node);
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
    const valueNode = unwrapExpression(prop.value);
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

// Traverses statement trees to find return statements with string values
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
      url: "https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/ui/sentence-case.md",
    },
    fixable: "code", // Allows ESLint to automatically fix violations
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
    const { evaluatorOptions, allowAutoFix } = resolveSentenceCaseConfig(context.options);

    const reportIfNeeded = createSentenceCaseReporter({
      context,
      evaluatorOptions,
      allowAutoFix,
      messageId: "useSentenceCase",
      debugLabel: "ui/sentence-case",
      formatReplacement: (node, suggestion) => {
        if (node.type === "Literal" && typeof node.value === "string" && typeof node.raw === "string") {
          const quoteChar = node.raw[0];
          if (quoteChar === "'" || quoteChar === '"') {
            return encodeStringLiteral(suggestion, quoteChar);
          }
        }
        return null;
      },
    });

    // Checks createEl calls for text properties in options object
    function checkCreateEl(node: TSESTree.CallExpression) {
      // createEl(tag, { text: "...", title: "..." })
      if (node.arguments.length < 2) return;
      const arg = node.arguments[1];
      if (arg.type === "SpreadElement") return;
      inspectCreateElOptions(arg, reportIfNeeded);
    }

    // Checks setAttribute calls for text-containing attributes
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

    // Checks addCommand calls for command name property
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

    // Checks various method calls for UI text arguments
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

    // Checks getDisplayText method implementations for returned strings
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
