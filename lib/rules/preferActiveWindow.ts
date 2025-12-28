import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "prefer-active-window",
    meta: {
        docs: {
            description:
                "Prefer activeWindow and activeDocument over window and document for pop-out window compatibility.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useActiveWindow:
                "Prefer 'activeWindow' over 'window' for pop-out window compatibility. Use 'activeWindow' from Obsidian's globals.",
            useActiveDocument:
                "Prefer 'activeDocument' over 'document' for pop-out window compatibility. Use 'activeDocument' from Obsidian's globals.",
        },
        fixable: "code" as const,
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            Identifier(node: TSESTree.Identifier) {
                // Skip if this identifier is a property access (e.g., obj.window)
                if (
                    node.parent?.type === "MemberExpression" &&
                    node.parent.property === node &&
                    !node.parent.computed
                ) {
                    return;
                }

                // Skip if this is a property key in an object
                if (
                    node.parent?.type === "Property" &&
                    node.parent.key === node
                ) {
                    return;
                }

                // Skip type annotations and declarations
                if (
                    node.parent?.type === "TSTypeReference" ||
                    node.parent?.type === "TSTypeAnnotation" ||
                    node.parent?.type === "TSInterfaceDeclaration" ||
                    node.parent?.type === "TSTypeAliasDeclaration"
                ) {
                    return;
                }

                // Skip if in import/export statements
                if (
                    node.parent?.type === "ImportSpecifier" ||
                    node.parent?.type === "ExportSpecifier"
                ) {
                    return;
                }

                // Check for bare 'window' usage
                if (node.name === "window") {
                    // Allow window.activeWindow pattern
                    if (
                        node.parent?.type === "MemberExpression" &&
                        node.parent.object === node &&
                        node.parent.property.type === "Identifier" &&
                        (node.parent.property.name === "activeWindow" ||
                            node.parent.property.name === "activeDocument")
                    ) {
                        return;
                    }

                    context.report({
                        node,
                        messageId: "useActiveWindow",
                        fix: (fixer) => fixer.replaceText(node, "activeWindow"),
                    });
                }

                // Check for bare 'document' usage
                if (node.name === "document") {
                    context.report({
                        node,
                        messageId: "useActiveDocument",
                        fix: (fixer) => fixer.replaceText(node, "activeDocument"),
                    });
                }
            },
        };
    },
});
