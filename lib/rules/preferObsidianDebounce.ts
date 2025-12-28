import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-obsidian-debounce",
    meta: {
        docs: {
            description:
                "Use Obsidian's debounce() function instead of custom implementations or third-party libraries.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useObsidianDebounce:
                "Use Obsidian's built-in debounce() function instead of importing from '{{source}}'.",
            customDebounce:
                "Consider using Obsidian's built-in debounce() function instead of a custom implementation.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            // Detect imports of debounce from common libraries
            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                const source = node.source.value;

                // Check for common debounce library imports
                const debounceLibraries = [
                    "lodash",
                    "lodash/debounce",
                    "lodash-es",
                    "lodash-es/debounce",
                    "underscore",
                    "debounce",
                    "throttle-debounce",
                ];

                if (
                    typeof source === "string" &&
                    debounceLibraries.some(
                        (lib) => source === lib || source.startsWith(lib + "/"),
                    )
                ) {
                    // Check if debounce is being imported
                    const hasDebounceImport = node.specifiers.some(
                        (spec) =>
                            (spec.type === "ImportSpecifier" &&
                                spec.imported.type === "Identifier" &&
                                spec.imported.name === "debounce") ||
                            (spec.type === "ImportDefaultSpecifier" &&
                                source.includes("debounce")),
                    );

                    if (hasDebounceImport) {
                        context.report({
                            node,
                            messageId: "useObsidianDebounce",
                            data: { source },
                        });
                    }
                }
            },

            // Detect function declarations that look like custom debounce implementations
            FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
                if (
                    node.id?.name?.toLowerCase().includes("debounce") &&
                    node.body.body.some(
                        (stmt) =>
                            stmt.type === "VariableDeclaration" &&
                            stmt.declarations.some(
                                (decl) =>
                                    decl.id.type === "Identifier" &&
                                    (decl.id.name === "timeout" ||
                                        decl.id.name === "timer" ||
                                        decl.id.name === "timeoutId"),
                            ),
                    )
                ) {
                    context.report({
                        node,
                        messageId: "customDebounce",
                    });
                }
            },

            // Detect arrow function variables that look like custom debounce
            VariableDeclarator(node: TSESTree.VariableDeclarator) {
                if (
                    node.id.type === "Identifier" &&
                    node.id.name.toLowerCase().includes("debounce") &&
                    node.init?.type === "ArrowFunctionExpression"
                ) {
                    const body = node.init.body;
                    if (
                        body.type === "BlockStatement" &&
                        body.body.some(
                            (stmt) =>
                                stmt.type === "VariableDeclaration" &&
                                stmt.declarations.some(
                                    (decl) =>
                                        decl.id.type === "Identifier" &&
                                        (decl.id.name === "timeout" ||
                                            decl.id.name === "timer" ||
                                            decl.id.name === "timeoutId"),
                                ),
                        )
                    ) {
                        context.report({
                            node,
                            messageId: "customDebounce",
                        });
                    }
                }
            },
        };
    },
});
