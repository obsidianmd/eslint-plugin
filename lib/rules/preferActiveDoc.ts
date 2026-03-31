import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const REPLACEMENTS: Record<string, string> = {
    document: "activeDocument",
    window: "activeWindow",
};

const BANNED_GLOBALS = new Set(["global", "globalThis"]);

export default ruleCreator({
    name: "prefer-active-doc",
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `activeDocument` and `activeWindow` over `document` and `window` for popout window compatibility.",
        },
        schema: [],
        fixable: "code" as const,
        messages: {
            preferActive:
                "Use '{{replacement}}' instead of '{{original}}' for popout window compatibility.",
            avoidGlobal:
                "Avoid using '{{name}}'. Use 'activeWindow' or 'activeDocument' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            Identifier(node: TSESTree.Identifier) {
                if (BANNED_GLOBALS.has(node.name)) {
                    return reportBannedGlobal(node);
                }

                const replacement = REPLACEMENTS[node.name];
                if (!replacement) {
                    return;
                }

                // Skip if this is a property access (e.g., `obj.document`)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.property === node
                ) {
                    return;
                }

                // Skip if this is a property key in an object literal
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.key === node
                ) {
                    return;
                }

                // Skip if this is a declaration (variable, function param, etc.)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.id === node
                ) {
                    return;
                }

                // Skip typeof expressions (typeof window === 'undefined')
                if (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") {
                    return;
                }

                // Check scope: only flag global references, not local variables named document/window
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                context.report({
                    node,
                    messageId: "preferActive",
                    data: {
                        original: node.name,
                        replacement,
                    },
                    fix(fixer) {
                        return fixer.replaceText(node, replacement);
                    },
                });
            },
        };

        function reportBannedGlobal(node: TSESTree.Identifier): void {
            // Same skip logic as replaceable globals
            if (
                (node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression && node.parent.property === node) ||
                (node.parent.type === TSESTree.AST_NODE_TYPES.Property && node.parent.key === node) ||
                (node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator && node.parent.id === node) ||
                (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof")
            ) {
                return;
            }

            const scope = context.sourceCode.getScope(node);
            const variable = findVariable(scope, node.name);
            if (variable && variable.defs.length > 0) {
                return;
            }

            context.report({
                node,
                messageId: "avoidGlobal",
                data: { name: node.name },
            });
        }

        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                const variable = current.variables.find((v) => v.name === name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
