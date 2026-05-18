import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_PROPERTIES = new Set(["userAgent", "platform"]);

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description: "Disallow use of navigator API for OS detection",
            url: docsUrl("platform"),
        },
        schema: [],
        messages: {
            avoidNavigator:
                "Avoid using the navigator API to detect the operating system. Use the Platform API instead.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                const property = node.property;
                if (
                    property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    !BANNED_PROPERTIES.has(property.name)
                ) {
                    return;
                }

                const object = node.object;

                // Case 1: `navigator.userAgent` or `navigator.platform`
                if (
                    object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    object.name === "navigator"
                ) {
                    context.report({
                        node,
                        messageId: "avoidNavigator",
                    });
                    return;
                }

                // Case 2: `window.navigator.userAgent` or `window.navigator.platform`
                if (
                    object.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    object.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    object.object.name === "window" &&
                    object.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    object.property.name === "navigator"
                ) {
                    context.report({
                        node,
                        messageId: "avoidNavigator",
                    });
                }
            },
        };
    },
});
