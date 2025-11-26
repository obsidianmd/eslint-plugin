import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

type Options = [{ pluginName?: string }?];

export default ruleCreator<Options, "pluginName">({
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
						typeof pluginName === "string" &&
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						property.key.name === "name" &&
						property.value.type === "Literal" &&
						typeof property.value.value === "string" &&
						property.value.value
							.toLowerCase()
							.includes(pluginName.toLowerCase())
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
