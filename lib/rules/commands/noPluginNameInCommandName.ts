import { TSESTree } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { removePhrase } from "./nameRemoval.js";
import { isCommandProperty } from "./property.js";
import { phrasePattern } from "./words.js";

type Options = [{ pluginName?: string }?];

/**
 * Whether the plugin name starts the command name with only whitespace and a
 * lower-case word after it, as in "Zoom in" or "Git commit": a word of the
 * sentence then, rather than a label.
 */
function startsWithNameAsWord(name: string, pattern: RegExp): boolean {
    const match = pattern.exec(name);
    return match !== null && match.index === 0 && /^\s+\p{Ll}/u.test(name.slice(match[0].length));
}

export default ruleCreator<Options, "pluginName" | "removePluginName">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow including the plugin name in a command name.",
            url: docsUrl("no-plugin-name-in-command-name", "commands"),
        },
        hasSuggestions: true as const,
        messages: {
            pluginName: "The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI.",
            removePluginName:
                "Rename the command to \"{{name}}\", without the plugin name, which Obsidian shows before the command name already.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    pluginName: {
                        type: "string",
                        description: "The plugin name to check against. Defaults to manifest.json name.",
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const pluginName = options.pluginName ?? getManifest()?.name;
        const pluginNamePattern = typeof pluginName === "string" ? phrasePattern(pluginName) : null;
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "addCommand" ||
                    node.arguments[0]?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
                ) {
                    return;
                }

                const commandObject = node.arguments[0];
                for (const property of commandObject.properties) {
                    if (
                        pluginNamePattern &&
                        isCommandProperty(property, "name") &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        pluginNamePattern.test(property.value.value)
                    ) {
                        const value = property.value;
                        // "Zoom in" of the plugin "Zoom": the name is the
                        // verb, and "In" would mean nothing
                        const edit = startsWithNameAsWord(value.value, pluginNamePattern)
                            ? null
                            : removePhrase(value.value, pluginNamePattern, {
                                prefixAfterSpace: true,
                                suffixAfterSpace: false,
                            });
                        const source = edit?.toSource(value.raw);
                        context.report({
                            node: property,
                            messageId: "pluginName",
                            suggest: edit && source
                                ? [{
                                    messageId: "removePluginName",
                                    data: { name: edit.text },
                                    fix: (fixer) => fixer.replaceText(value, source),
                                }]
                                : [],
                        });
                    }
                }
            },
        };
    },
});
