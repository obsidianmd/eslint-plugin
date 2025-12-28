import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// Vault methods that take path arguments
const VAULT_PATH_METHODS = [
    "getAbstractFileByPath",
    "getFileByPath",
    "getFolderByPath",
    "create",
    "createFolder",
    "rename",
    "copy",
    "delete",
    "trash",
];

export default ruleCreator({
    name: "use-normalize-path",
    meta: {
        docs: {
            description:
                "Apply normalizePath() to user-provided paths for cross-platform compatibility.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useNormalizePath:
                "Use normalizePath() on path arguments to Vault methods for cross-platform compatibility.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        // Track variables that have been normalized
        const normalizedPaths = new Set<string>();

        return {
            // Track normalizePath() calls to know which variables are safe
            CallExpression(node: TSESTree.CallExpression) {
                // Check for normalizePath(path) calls assigned to variables
                if (
                    node.callee.type === "Identifier" &&
                    node.callee.name === "normalizePath" &&
                    node.parent?.type === "VariableDeclarator" &&
                    node.parent.id.type === "Identifier"
                ) {
                    normalizedPaths.add(node.parent.id.name);
                }

                // Check for vault method calls with path arguments
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.property.type === "Identifier" &&
                    VAULT_PATH_METHODS.includes(node.callee.property.name) &&
                    isVaultAccess(node.callee.object)
                ) {
                    // First argument is typically the path
                    const pathArg = node.arguments[0];

                    if (pathArg && shouldWarnAboutPath(pathArg, normalizedPaths)) {
                        context.report({
                            node: pathArg,
                            messageId: "useNormalizePath",
                        });
                    }
                }
            },

            // Reset tracking when leaving function scope
            "FunctionDeclaration:exit"() {
                normalizedPaths.clear();
            },
            "FunctionExpression:exit"() {
                normalizedPaths.clear();
            },
            "ArrowFunctionExpression:exit"() {
                normalizedPaths.clear();
            },
        };
    },
});

function isVaultAccess(node: TSESTree.Expression): boolean {
    if (node.type === "Identifier" && node.name === "vault") {
        return true;
    }

    if (
        node.type === "MemberExpression" &&
        node.property.type === "Identifier" &&
        node.property.name === "vault"
    ) {
        return true;
    }

    return false;
}

function shouldWarnAboutPath(
    node: TSESTree.Node,
    normalizedPaths: Set<string>,
): boolean {
    // String literals are okay - they're hardcoded, not user input
    if (node.type === "Literal" && typeof node.value === "string") {
        return false;
    }

    // If it's a normalizePath() call directly, it's fine
    if (
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === "normalizePath"
    ) {
        return false;
    }

    // If it's a variable that was normalized, it's fine
    if (node.type === "Identifier" && normalizedPaths.has(node.name)) {
        return false;
    }

    // Template literals without expressions are okay (static strings)
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
        return false;
    }

    // Template literals with path construction should use normalizePath
    if (node.type === "TemplateLiteral" && node.expressions.length > 0) {
        return true;
    }

    // String concatenation for paths should use normalizePath
    if (node.type === "BinaryExpression" && node.operator === "+") {
        return true;
    }

    // Identifiers that look like user input should use normalizePath
    if (node.type === "Identifier") {
        const name = node.name.toLowerCase();
        if (
            name.includes("path") ||
            name.includes("input") ||
            name.includes("user")
        ) {
            return true;
        }
    }

    // Member expressions accessing path-like properties
    if (
        node.type === "MemberExpression" &&
        node.property.type === "Identifier"
    ) {
        const propName = node.property.name.toLowerCase();
        if (propName.includes("path") || propName === "value") {
            return true;
        }
    }

    return false;
}
