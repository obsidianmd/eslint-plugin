import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "object-assign",
    meta: {
        type: "problem" as const,
        docs: {
            description: "Discourage using `Object.assign` with two arguments",
            //TODO: Add url
        },
        schema: [],
        messages: {
            twoArgumentsDefault: "Using `Object.assign` with an non-empty target object can lead to unexpected behaviour as it will overwrite the  target object.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee &&
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "Object" &&
                    node.callee.property &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.property.name === "assign" &&
                    node.arguments.length === 2 &&
                    node.arguments[0].type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.arguments[0].name.toLowerCase().includes("default") &&
                    node.arguments[1].type !== TSESTree.AST_NODE_TYPES.ObjectExpression
                ) {
                    context.report({
                        node,
                        messageId: "twoArgumentsDefault",
                    });
                }
            },
        };
    },
});
