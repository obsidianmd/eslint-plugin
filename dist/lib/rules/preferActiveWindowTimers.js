import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
const TIMER_FUNCTIONS = new Set([
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
]);
export default ruleCreator({
    name: "prefer-active-window-timers",
    meta: {
        type: "suggestion",
        docs: {
            description: "Prefer `activeWindow.setTimeout()` and related timer functions over bare global calls for popout window compatibility.",
        },
        schema: [],
        fixable: "code",
        messages: {
            preferActiveWindow: "Use 'activeWindow.{{name}}()' instead of '{{name}}()' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (node.callee.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                    return;
                }
                const name = node.callee.name;
                if (!TIMER_FUNCTIONS.has(name)) {
                    return;
                }
                // Only flag global references, not local functions
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, name);
                if (variable && variable.defs.length > 0) {
                    return;
                }
                context.report({
                    node: node.callee,
                    messageId: "preferActiveWindow",
                    data: { name },
                    fix(fixer) {
                        return fixer.replaceText(node.callee, `activeWindow.${name}`);
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
