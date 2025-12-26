import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

type Options = [{ pluginId?: string }?];

export default ruleCreator<Options, "pluginId">({
    name: "no-plugin-id-in-command-id",
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow including the plugin ID in a command ID.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
        },
        messages: {
            pluginId: "The command ID should not include the plugin ID. Obsidian will make sure that there are no conflicts with other plugins.",
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
                        typeof pluginId === "string" &&
                        property.type === TSESTree.AST_NODE_TYPES.Property &&
                        property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
                        property.key.name === "id" &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        property.value.value
                            .toLowerCase()
                            .includes(pluginId.toLowerCase())
                    ) {
                        context.report({
                            node: property,
                            messageId: "pluginId",
                        });
                    }
                }
            },
        };
    },
});
