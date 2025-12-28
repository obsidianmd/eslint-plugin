import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/vault/${name}.md`,
);

export default ruleCreator({
    name: "vault-prefer-cached-read",
    meta: {
        docs: {
            description:
                "Prefer Vault.cachedRead() over Vault.read() when not writing to the file afterward.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            preferCachedRead:
                "Prefer vault.cachedRead() over vault.read() for better performance when you're only reading the file.",
        },
        schema: [],
        fixable: "code" as const,
    },
    defaultOptions: [],
    create: (context) => {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Check for *.read() calls
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.property.type === "Identifier" &&
                    node.callee.property.name === "read"
                ) {
                    // Check if it's called on something that looks like vault
                    const callee = node.callee;
                    const object = callee.object;

                    if (isVaultAccess(object)) {
                        context.report({
                            node: callee.property,
                            messageId: "preferCachedRead",
                            fix: (fixer) =>
                                fixer.replaceText(
                                    callee.property,
                                    "cachedRead",
                                ),
                        });
                    }
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
