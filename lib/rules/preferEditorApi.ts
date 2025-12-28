import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-editor-api",
    meta: {
        docs: {
            description:
                "Prefer the Editor API over Vault.modify() to preserve cursor position and selection during edits.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Prefer+the+Editor+API+to+%60Vault.modify%60",
        },
        type: "suggestion" as const,
        messages: {
            preferEditorApi:
                "Prefer the Editor API over vault.modify() to preserve cursor position and selection. Use vault.process() for atomic modifications when Editor is not available.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Check for *.modify() calls on vault
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.property.type === "Identifier" &&
                    node.callee.property.name === "modify" &&
                    isVaultAccess(node.callee.object)
                ) {
                    context.report({
                        node,
                        messageId: "preferEditorApi",
                    });
                }
            },
        };
    },
});

function isVaultAccess(node: TSESTree.Expression): boolean {
    // Direct vault identifier
    if (node.type === "Identifier" && node.name === "vault") {
        return true;
    }

    // *.vault member expression (e.g., this.app.vault)
    if (
        node.type === "MemberExpression" &&
        node.property.type === "Identifier" &&
        node.property.name === "vault"
    ) {
        return true;
    }

    return false;
}
