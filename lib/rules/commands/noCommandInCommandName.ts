import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

export default ruleCreator({
    name: "no-command-in-command-name",
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow using the word 'command' in a command name.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
        },
        messages: {
            commandInName:
                "Adding `command` to the command name is not necessary.",
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
                        property.key.name === "name" &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        property.value.value.toLowerCase().includes("command")
                    ) {
                        context.report({
                            node: property,
                            messageId: "commandInName",
                        });
                    }
                }
            },
        };
    },
});
