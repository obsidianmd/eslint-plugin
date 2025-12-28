import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// Pattern to match "Obsidian X" where X is a word (plugin name pattern)
// Allows "Obsidian" alone, "Obsidian's", "Obsidian API", "Obsidian Publish", "Obsidian Sync" (official products)
const OFFICIAL_OBSIDIAN_TERMS = [
    "obsidian api",
    "obsidian publish",
    "obsidian sync",
    "obsidian canvas",
    "obsidian mobile",
    "obsidian desktop",
    "obsidian vault",
    "obsidian uri",
    "obsidian developer",
    "obsidian community",
    "obsidian forum",
    "obsidian help",
    "obsidian documentation",
    "obsidian docs",
    "obsidian settings",
    "obsidian app",
];

function isObsidianBranding(str: string): boolean {
    const lower = str.toLowerCase();

    // Check for "Obsidian X" pattern where X is a word
    const match = lower.match(/\bobsidian\s+(\w+)/);
    if (!match) {
        return false;
    }

    // Allow official Obsidian terms
    const fullMatch = `obsidian ${match[1]}`;
    if (OFFICIAL_OBSIDIAN_TERMS.some((term) => fullMatch.startsWith(term))) {
        return false;
    }

    // Flag patterns like "Obsidian Plugin Name", "Obsidian My Tool"
    return true;
}

export default ruleCreator({
    name: "no-obsidian-branding",
    meta: {
        docs: {
            description:
                "Don't reference community plugins as 'Obsidian XYZ' due to branding guidelines.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "problem" as const,
        messages: {
            noObsidianBranding:
                "Don't use 'Obsidian' in your plugin name or UI text. Community plugins should not be named 'Obsidian XYZ' due to branding guidelines.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        function checkString(node: TSESTree.Node, value: string) {
            if (isObsidianBranding(value)) {
                context.report({
                    node,
                    messageId: "noObsidianBranding",
                });
            }
        }

        return {
            // Check string literals
            Literal(node: TSESTree.Literal) {
                if (typeof node.value === "string") {
                    checkString(node, node.value);
                }
            },

            // Check template literal quasi (static parts)
            TemplateElement(node: TSESTree.TemplateElement) {
                if (node.value.cooked) {
                    checkString(node, node.value.cooked);
                }
            },
        };
    },
});
