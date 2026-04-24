import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
const REPLACEMENTS = {
    document: "activeDocument",
};
const WINDOW_TIMER_METHODS = new Set([
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);
export default ruleCreator({
    name: "prefer-active-doc",
    meta: {
        type: "suggestion",
        docs: {
            description: "Prefer `activeDocument` over `document` for popout window compatibility.",
        },
        schema: [],
        fixable: undefined,
        messages: {
            preferActive: "Use '{{replacement}}' instead of '{{original}}' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            Identifier(node) {
                if (!Object.hasOwn(REPLACEMENTS, node.name)) {
                    return;
                }
                const replacement = REPLACEMENTS[node.name];
                if (!replacement) {
                    return;
                }
                // Skip if this is a property access (e.g., `obj.document`)
                if (node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.property === node) {
                    return;
                }
                // Skip if this is a property key in an object literal
                if (node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.key === node) {
                    return;
                }
                // Skip if this is a declaration (variable, function param, etc.)
                if (node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.id === node) {
                    return;
                }
                // Skip typeof expressions (typeof window === 'undefined')
                if (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") {
                    return;
                }
                // Skip window.setTimeout/clearTimeout/setInterval/clearInterval — timer functions should use window, not activeWindow
                if (node.name === "window" &&
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.object === node &&
                    node.parent.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    WINDOW_TIMER_METHODS.has(node.parent.property.name)) {
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
                });
            },
        };
        function findVariable(scope, name) {
            let current = scope;
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
