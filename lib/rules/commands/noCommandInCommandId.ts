import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow using the word 'command' in a command ID.",
            url: docsUrl("no-command-in-command-id", "commands"),
        },
        messages: {
            commandInId: "Adding `command` to the command ID is not necessary.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "addCommand" ||
                    node.arguments[0]?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
                ) {
                    return;
                }

                const commandObject = node.arguments[0];
                for (const property of commandObject.properties) {
                    if (
                        property.type === TSESTree.AST_NODE_TYPES.Property &&
                        property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
                        property.key.name === "id" &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        property.value.value.toLowerCase().includes("command")
                    ) {
                        context.report({
                            node: property,
                            messageId: "commandInId",
                        });
                    }
                }
            },
        };
    },
});
