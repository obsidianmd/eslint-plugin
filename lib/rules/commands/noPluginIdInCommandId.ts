import { TSESTree } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { removeIdWords } from "./idRemoval.js";
import { commandIds, idRewrite } from "./idSuggestion.js";
import { isCommandProperty } from "./property.js";
import { idWords, indexOfWords } from "./words.js";

type Options = [{ pluginId?: string }?];

export default ruleCreator<Options, "pluginId" | "removePluginId">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow including the plugin ID in a command ID.",
            url: docsUrl("no-plugin-id-in-command-id", "commands"),
        },
        hasSuggestions: true as const,
        messages: {
            pluginId: "The command ID should not include the plugin ID. Obsidian will make sure that there are no conflicts with other plugins.",
            removePluginId:
                "Rename the command ID to \"{{id}}\", without the plugin ID. Users lose any hotkey they set for this command, and executeCommandById() calls, obsidian:// URIs and other plugins that run it by its old ID stop working.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    pluginId: {
                        type: "string",
                        description: "The plugin ID to check against. Defaults to manifest.json id.",
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const pluginId = options.pluginId ?? getManifest()?.id;
        const pluginIdWords = typeof pluginId === "string" ? idWords(pluginId) : [];
        const ids = commandIds();
        const reported: Array<{ property: TSESTree.Property; value: TSESTree.StringLiteral }> = [];
        return {
            ObjectExpression(node: TSESTree.ObjectExpression) {
                ids.add(node);
            },
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
                        pluginIdWords.length > 0 &&
                        isCommandProperty(property, "id") &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        // A namespace in front, as in `my-plugin-open-note`;
                        // elsewhere the words name what the command acts
                        // on, as in `show-calendar-view` of "calendar"
                        indexOfWords(idWords(property.value.value), pluginIdWords) === 0
                    ) {
                        reported.push({ property, value: property.value });
                    }
                }
            },
            // Reported once every command ID in the file is known, so that a
            // suggestion never gives two commands the same ID
            "Program:exit"() {
                for (const { property, value } of reported) {
                    const rewrite = idRewrite(value, removeIdWords(value.value, pluginIdWords, { atStart: true }), ids);
                    context.report({
                        node: property,
                        messageId: "pluginId",
                        suggest: rewrite ? [{ messageId: "removePluginId", data: { id: rewrite.id }, fix: rewrite.fix }] : [],
                    });
                }
            },
        };
    },
});
