import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

// `vault`, or any non-computed member access ending in `.vault`:
// `this.app.vault`, `app.vault`, `plugin.app.vault`, `this.vault`.
function isVault(node: TSESTree.Node): boolean {
    if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return node.name === "vault";
    }
    return (
        node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "vault"
    );
}

export default ruleCreator({
    meta: {
        docs: {
            description:
                "Avoid iterating all files to find a file by its path",
            url: docsUrl("iterate", "vault"),
        },
        type: "problem" as const,
        messages: {
            iterate: "Avoid iterating all files to find a file by its path\n",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                if (
                    node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.property.name === "find" &&
                    node.object.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.object.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.object.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.object.callee.property.name === "getFiles" &&
                    isVault(node.object.callee.object)
                ) {
                    if (
                        node.parent &&
                        node.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                        node.parent.arguments &&
                        node.parent.arguments.length > 0
                    ) {
                        let findArgument = node.parent.arguments[0];
                        if (
                            findArgument.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                            findArgument.body.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
                            (findArgument.body.operator === "===" ||
                                findArgument.body.operator === "==") &&
                            findArgument.body.left.type ===
                            TSESTree.AST_NODE_TYPES.MemberExpression &&
                            findArgument.body.left.object.type ===
                            TSESTree.AST_NODE_TYPES.Identifier && //
                            findArgument.body.left.object.parent.type ===
                            TSESTree.AST_NODE_TYPES.MemberExpression &&
                            findArgument.body.left.object.parent.property
                                .type === TSESTree.AST_NODE_TYPES.Identifier &&
                            findArgument.body.left.object.parent.property
                                .name === "path"
                        ) {
                            context.report({
                                node,
                                messageId: "iterate",
                            });
                        }
                    }
                }
            },
        };
    },
});
