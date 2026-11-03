import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import type { ParserServices } from "@typescript-eslint/utils";
import type ts from "typescript";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const INSTANCEABLE_BASE_TYPES = new Set(["Node", "UIEvent"]);

function isInstanceableType(type: ts.Type, services: ParserServices): boolean {
    const constraint = type.getConstraint();

    if (constraint) {
        type = constraint;
    }

    const symbol = type.getSymbol();
    if (symbol && INSTANCEABLE_BASE_TYPES.has(symbol.name)) {
        return true;
    }

    const baseTypes = type.getBaseTypes();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (isInstanceableType(baseType, services)) {
                return true;
            }
        }
    }

    return false;
}

// Operands that can be the object of `.instanceOf(...)` without parentheses.
// Anything else, such as `await el`, `el as Node` or `a ? b : c`, binds looser
// than member access and is wrapped: `(await el).instanceOf(HTMLElement)`.
const MEMBER_OBJECT_TYPES = new Set<TSESTree.AST_NODE_TYPES>([
    TSESTree.AST_NODE_TYPES.CallExpression,
    TSESTree.AST_NODE_TYPES.Identifier,
    TSESTree.AST_NODE_TYPES.MemberExpression,
    TSESTree.AST_NODE_TYPES.ThisExpression,
    TSESTree.AST_NODE_TYPES.TSNonNullExpression,
]);

function hasInstanceOfMethod(type: ts.Type): boolean {
    const property = type.getProperty("instanceOf");
    return property !== undefined;
}

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.",
            url: docsUrl("prefer-instanceof"),
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferInstanceof:
                "Use '.instanceOf({{className}})' instead of 'instanceof {{className}}' for cross-window safe type checking.",
            preferInstanceofSuggestion:
                "Replace 'instanceof {{className}}' with '.instanceOf({{className}})'.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            BinaryExpression(node: TSESTree.BinaryExpression) {
                if (node.operator !== "instanceof") {
                    return;
                }

                const leftType = services.getTypeAtLocation(node.left);
                if (!isInstanceableType(leftType, services)) {
                    return;
                }

                const rightText = context.sourceCode.getText(node.right);
                const leftText = MEMBER_OBJECT_TYPES.has(node.left.type)
                    ? context.sourceCode.getText(node.left)
                    : `(${context.sourceCode.getText(node.left)})`;
                // `a instanceof (b, C)` must not become two arguments.
                const argumentText = node.right.type === TSESTree.AST_NODE_TYPES.SequenceExpression
                    ? `(${rightText})`
                    : rightText;
                const replacement = `${leftText}.instanceOf(${argumentText})`;
                const canAutofix = hasInstanceOfMethod(leftType);

                context.report({
                    node,
                    messageId: "preferInstanceof",
                    data: {
                        className: argumentText,
                    },
                    ...(canAutofix
                        ? {
                            fix(fixer) {
                                return fixer.replaceText(node, replacement);
                            },
                        }
                        : {
                            suggest: [
                                {
                                    messageId: "preferInstanceofSuggestion" as const,
                                    data: { className: argumentText },
                                    fix(fixer) {
                                        return fixer.replaceText(node, replacement);
                                    },
                                },
                            ],
                        }),
                });
            },
        };
    },
});
