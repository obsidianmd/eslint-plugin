import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "detach-leaves",
    meta: {
        docs: {
            description: "Don't detach leaves in onunload.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Don't+detach+leaves+in+%60onunload%60",
        },
        type: "problem" as const,
        messages: {
            onunload: "Don't detach leaves in onunload, as that will reset the leaf to it's default location when the plugin is loaded, even if the user has moved it to a different location.",
        },
        schema: [],
        fixable: "code" as const,
    },
    defaultOptions: [],
    create: (context) => {
        return {
            MethodDefinition(node: TSESTree.MethodDefinition) {
                if (
                    node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.key.name === "onunload"
                ) {
                    if (
                        node.value.type === TSESTree.AST_NODE_TYPES.FunctionExpression &&
                        node.value.body &&
                        node.value.body.type === TSESTree.AST_NODE_TYPES.BlockStatement
                    ) {
                        node.value.body.body.forEach((statement) => {
                            if (
                                statement.type === TSESTree.AST_NODE_TYPES.ExpressionStatement &&
                                statement.expression.type ===
                                TSESTree.AST_NODE_TYPES.CallExpression &&
                                statement.expression.callee.type ===
                                TSESTree.AST_NODE_TYPES.MemberExpression &&
                                statement.expression.callee.property.type ===
                                TSESTree.AST_NODE_TYPES.Identifier &&
                                statement.expression.callee.property.name ===
                                "detachLeavesOfType"
                            ) {
                                context.report({
                                    node,
                                    messageId: "onunload",
                                    fix: (fixer) => fixer.remove(statement),
                                });
                            }
                        });
                    }
                }
            },
        };
    },
});
