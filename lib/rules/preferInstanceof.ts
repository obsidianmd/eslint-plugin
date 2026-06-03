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
                const leftText = context.sourceCode.getText(node.left);
                const canAutofix = hasInstanceOfMethod(leftType);

                context.report({
                    node,
                    messageId: "preferInstanceof",
                    data: {
                        className: rightText,
                    },
                    ...(canAutofix
                        ? {
                            fix(fixer) {
                                return fixer.replaceText(node, `${leftText}.instanceOf(${rightText})`);
                            },
                        }
                        : {
                            suggest: [
                                {
                                    messageId: "preferInstanceofSuggestion" as const,
                                    data: { className: rightText },
                                    fix(fixer) {
                                        return fixer.replaceText(node, `${leftText}.instanceOf(${rightText})`);
                                    },
                                },
                            ],
                        }),
                });
            },
        };
    },
});
