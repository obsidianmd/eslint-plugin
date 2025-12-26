import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/vault/${name}.md`,
);

export default ruleCreator({
    name: "vault-iterate",
    meta: {
        docs: {
            description:
                "Avoid iterating all files to find a file by its path",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path",
        },
        type: "problem" as const,
        messages: {
            iterate: "Avoid iterating all files to find a file by its path\n",
        },
        schema: [],
        fixable: "code" as const,
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
                    node.object.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.object.callee.object.name === "vault"
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
