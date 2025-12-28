import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-stringify-yaml",
    meta: {
        docs: {
            description:
                "Use stringifyYaml() from Obsidian instead of manually building YAML strings.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useStringifyYaml:
                "Use stringifyYaml() from Obsidian instead of manually building YAML strings.",
            manualYamlConstruction:
                "Avoid manual YAML string construction. Use stringifyYaml() for consistent formatting.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            // Detect template literals that look like YAML frontmatter
            TemplateLiteral(node: TSESTree.TemplateLiteral) {
                // Check if the template starts with --- (YAML frontmatter marker)
                if (node.quasis.length > 0) {
                    const firstQuasi = node.quasis[0];
                    const rawValue = firstQuasi.value.raw;

                    // Check for frontmatter pattern
                    if (
                        rawValue.startsWith("---\n") ||
                        rawValue.startsWith("---\\n")
                    ) {
                        context.report({
                            node,
                            messageId: "manualYamlConstruction",
                        });
                        return;
                    }

                    // Check for YAML key-value patterns in template
                    const yamlPattern = /^\s*\w+:\s*$/m;
                    if (
                        yamlPattern.test(rawValue) &&
                        node.expressions.length > 0
                    ) {
                        // Has expressions interpolated after YAML keys
                        context.report({
                            node,
                            messageId: "manualYamlConstruction",
                        });
                    }
                }
            },

            // Detect string concatenation building YAML
            BinaryExpression(node: TSESTree.BinaryExpression) {
                if (node.operator !== "+") return;

                // Look for patterns like "---\n" + value (frontmatter marker)
                if (
                    node.left.type === "Literal" &&
                    typeof node.left.value === "string"
                ) {
                    const str = node.left.value;
                    // Only flag clear YAML frontmatter markers
                    if (str === "---\n" || str === "---\\n") {
                        context.report({
                            node,
                            messageId: "manualYamlConstruction",
                        });
                    }
                    // Flag common YAML frontmatter keys
                    const yamlKeys = ["title: ", "author: ", "date: ", "tags: ", "description: ", "type: "];
                    if (yamlKeys.includes(str.toLowerCase())) {
                        context.report({
                            node,
                            messageId: "manualYamlConstruction",
                        });
                    }
                }
            },

            // Detect imports of yaml libraries when stringifyYaml is available
            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                const source = node.source.value;

                if (
                    typeof source === "string" &&
                    (source === "yaml" ||
                        source === "js-yaml" ||
                        source === "yamljs")
                ) {
                    const hasStringify = node.specifiers.some(
                        (spec) =>
                            (spec.type === "ImportSpecifier" &&
                                spec.imported.type === "Identifier" &&
                                (spec.imported.name === "stringify" ||
                                    spec.imported.name === "dump")) ||
                            spec.type === "ImportDefaultSpecifier" ||
                            spec.type === "ImportNamespaceSpecifier",
                    );

                    if (hasStringify) {
                        context.report({
                            node,
                            messageId: "useStringifyYaml",
                        });
                    }
                }
            },
        };
    },
});
