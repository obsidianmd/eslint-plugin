import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const TIMER_FUNCTIONS = new Set([
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);

export default ruleCreator({
    name: "prefer-window-timers",
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.",
        },
        schema: [],
        fixable: "code" as const,
        messages: {
            preferWindowTimer:
                "Use 'window.{{name}}()' instead of '{{name}}()' for popout window compatibility.",
            noActiveWindowTimer:
                "Use 'window.{{name}}()' instead of 'activeWindow.{{name}}()'. Timer functions should use 'window'.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Bare timer call: setTimeout() → window.setTimeout()
                if (node.callee.type === TSESTree.AST_NODE_TYPES.Identifier) {
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
                        messageId: "preferWindowTimer",
                        data: { name },
                        fix(fixer) {
                            return fixer.replaceText(node.callee, `window.${name}`);
                        },
                    });
                    return;
                }

                // activeWindow.setTimeout() → window.setTimeout()
                if (
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "activeWindow" &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    TIMER_FUNCTIONS.has(node.callee.property.name)
                ) {
                    const name = node.callee.property.name;
                    context.report({
                        node: node.callee,
                        messageId: "noActiveWindowTimer",
                        data: { name },
                        fix(fixer) {
                            return fixer.replaceText(node.callee.object, "window");
                        },
                    });
                }
            },
        };

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
