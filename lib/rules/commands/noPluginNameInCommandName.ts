import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { manifest } from "../../readManifest.js";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

export default ruleCreator({
	name: "no-plugin-name-in-command-name",
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Disallow including the plugin name in a command name.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		messages: {
			pluginName: "The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI.",
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
						typeof manifest.name === "string" &&
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						property.key.name === "name" &&
						property.value.type === "Literal" &&
						typeof property.value.value === "string" &&
						property.value.value
							.toLowerCase()
							.includes(manifest.name.toLowerCase())
					) {
						context.report({
							node: property,
							messageId: "pluginName",
						});
					}
				}
			},
		};
	},
});
