import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-active-view-of-type",
    meta: {
        docs: {
            description:
                "Use getActiveViewOfType() instead of directly accessing workspace.activeLeaf.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useGetActiveViewOfType:
                "Avoid directly accessing workspace.activeLeaf. Use workspace.getActiveViewOfType() instead for type-safe view access.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                // Check for *.activeLeaf access
                if (
                    node.property.type === "Identifier" &&
                    node.property.name === "activeLeaf"
                ) {
                    // Check if the object looks like workspace access
                    // Could be: workspace.activeLeaf, this.app.workspace.activeLeaf, app.workspace.activeLeaf
                    if (isWorkspaceAccess(node.object)) {
                        context.report({
                            node,
                            messageId: "useGetActiveViewOfType",
                        });
                    }
                }
            },
        };
    },
});

function isWorkspaceAccess(node: TSESTree.Expression): boolean {
    // Direct workspace identifier
    if (node.type === "Identifier" && node.name === "workspace") {
        return true;
    }

    // *.workspace member expression
    if (
        node.type === "MemberExpression" &&
        node.property.type === "Identifier" &&
        node.property.name === "workspace"
    ) {
        return true;
    }

    return false;
}
