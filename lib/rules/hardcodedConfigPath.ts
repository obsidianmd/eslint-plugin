import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

// `.obsidian` as a path segment, not part of a longer name or host such as
// `.obsidian-cache`, `.obsidianrc`, `.obsidian2`, `.obsidian.vimrc` (a file
// in the vault root) or `publish.obsidian.md`.
const CONFIG_PATH = /(?<![a-zA-Z0-9])\.obsidian(?![a-zA-Z0-9_-]|\.[a-zA-Z0-9])/;

// Stands in for a `${…}` next to a template literal's text. The value may be
// part of the same name, as in `${name}.obsidian` or `.obsidian${suffix}`, so
// it counts as a letter: `.obsidian` right after or before it is not a match.
const PLACEHOLDER = "x";

export default ruleCreator({
    meta: {
        docs: {
            description: "Disallow hardcoded `.obsidian` config paths. Use `Vault#configDir` instead.",
            url: docsUrl("hardcoded-config-path"),
        },
        type: "problem" as const,
        messages: {
            configPath:
                "Obsidian's configuration folder is not necessarily `.obsidian`, it can be configured by the user. Use `Vault#configDir` to get the current value",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            Literal(node: TSESTree.Literal) {
                if (typeof node.value === "string" && CONFIG_PATH.test(node.value)) {
                    context.report({
                        node,
                        messageId: "configPath",
                    });
                }
            },
            TemplateLiteral(node: TSESTree.TemplateLiteral) {
                // A tag such as String.raw sees the text as written.
                const tagged =
                    node.parent.type === TSESTree.AST_NODE_TYPES.TaggedTemplateExpression && node.parent.quasi === node;
                const match = node.quasis.find((quasi, index) => {
                    const text = tagged ? quasi.value.raw : (quasi.value.cooked ?? quasi.value.raw);
                    const before = index > 0 ? PLACEHOLDER : "";
                    const after = quasi.tail ? "" : PLACEHOLDER;
                    return CONFIG_PATH.test(before + text + after);
                });
                if (match) {
                    context.report({
                        node: match,
                        messageId: "configPath",
                    });
                }
            },
        };
    },
});
