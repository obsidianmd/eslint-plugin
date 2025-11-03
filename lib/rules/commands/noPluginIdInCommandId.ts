import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { manifest } from "../../readManifest.js";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

export default ruleCreator({
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
		schema: [],
	},
	defaultOptions: [],
	create(context) {
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
});
