import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const TIMER_FUNCTIONS = [
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
];

export default ruleCreator({
    name: "prefer-window-timers",
    meta: {
        docs: {
            description:
                "Use window.setTimeout, window.setInterval, etc. instead of bare timer functions.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useWindowPrefix:
                "Use window.{{name}} instead of {{name}} for proper scoping and cleanup.",
        },
        schema: [],
        fixable: "code" as const,
    },
    defaultOptions: [],
    create: (context) => {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Check for bare timer function calls like setTimeout(...)
                if (
                    node.callee.type === "Identifier" &&
                    TIMER_FUNCTIONS.includes(node.callee.name)
                ) {
                    const name = node.callee.name;
                    context.report({
                        node: node.callee,
                        messageId: "useWindowPrefix",
                        data: { name },
                        fix: (fixer) =>
                            fixer.replaceText(node.callee, `window.${name}`),
                    });
                }
            },
        };
    },
});
