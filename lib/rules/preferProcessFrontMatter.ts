import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-process-front-matter",
    meta: {
        docs: {
            description:
                "Use processFrontMatter() for modifying YAML frontmatter instead of manual string manipulation.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useProcessFrontMatter:
                "Use app.fileManager.processFrontMatter() for modifying frontmatter to maintain consistent YAML formatting.",
            manualYamlParsing:
                "Avoid manually parsing frontmatter. Use app.metadataCache.getFileCache() to read and processFrontMatter() to modify.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            // Detect patterns like content.split('---') which suggests manual frontmatter parsing
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.property.type === "Identifier" &&
                    node.callee.property.name === "split" &&
                    node.arguments.length > 0
                ) {
                    const arg = node.arguments[0];
                    if (
                        arg.type === "Literal" &&
                        (arg.value === "---" || arg.value === "---\n")
                    ) {
                        context.report({
                            node,
                            messageId: "manualYamlParsing",
                        });
                    }
                }
            },

            // Detect regex patterns for frontmatter extraction
            NewExpression(node: TSESTree.NewExpression) {
                if (
                    node.callee.type === "Identifier" &&
                    node.callee.name === "RegExp" &&
                    node.arguments.length > 0
                ) {
                    const arg = node.arguments[0];
                    if (
                        arg.type === "Literal" &&
                        typeof arg.value === "string" &&
                        (arg.value.includes("---") ||
                            arg.value.includes("^---"))
                    ) {
                        context.report({
                            node,
                            messageId: "manualYamlParsing",
                        });
                    }
                }
            },

            // Detect regex literals for frontmatter
            Literal(node: TSESTree.Literal) {
                if (
                    "regex" in node &&
                    node.regex &&
                    typeof node.regex.pattern === "string" &&
                    node.regex.pattern.includes("^---")
                ) {
                    context.report({
                        node,
                        messageId: "manualYamlParsing",
                    });
                }
            },
        };
    },
});
