import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { manifest } from "../../readManifest.js";

export default {
	name: "no-plugin-id-in-command-id",
	meta: {
		type: "suggestion" as const,
		docs: {
			description: "Disallow including the plugin ID in a command ID.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		messages: {
			pluginId: "The command ID should not include the plugin ID.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context: TSESLint.RuleContext<"pluginId", []>) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type !== "MemberExpression" ||
					node.callee.property.type !== "Identifier" ||
					node.callee.property.name !== "addCommand" ||
					node.arguments[0]?.type !== "ObjectExpression"
				) {
					return;
				}

				const commandObject = node.arguments[0];
				for (const property of commandObject.properties) {
					if (
						typeof manifest.id === "string" &&
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						property.key.name === "id" &&
						property.value.type === "Literal" &&
						typeof property.value.value === "string" &&
						property.value.value
							.toLowerCase()
							.includes(manifest.id.toLowerCase())
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
};
