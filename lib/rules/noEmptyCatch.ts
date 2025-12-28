import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "no-empty-catch",
    meta: {
        docs: {
            description:
                "Catch blocks must contain error handling code or an explanatory comment.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "problem" as const,
        messages: {
            emptyCatch:
                "Empty catch block. Add error handling (e.g., console.error) or an explanatory comment describing why the error is intentionally ignored.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        const sourceCode = context.sourceCode;

        return {
            CatchClause(node: TSESTree.CatchClause) {
                const body = node.body;

                // Check if the catch block body is empty
                if (body.body.length === 0) {
                    // Check for comments inside the catch block
                    const comments = sourceCode.getCommentsInside(body);

                    if (comments.length === 0) {
                        context.report({
                            node,
                            messageId: "emptyCatch",
                        });
                    }
                }
            },
        };
    },
});
