import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

export default ruleCreator({
	name: "no-command-in-command-name",
	meta: {
		type: "suggestion" as const,
		docs: {
			description: "Disallow using the word 'command' in a command name.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		messages: {
			commandInName:
				"Adding `command` to the command name is not necessary.",
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
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						property.key.name === "name" &&
						property.value.type === "Literal" &&
						typeof property.value.value === "string" &&
						property.value.value.toLowerCase().includes("command")
					) {
						context.report({
							node: property,
							messageId: "commandInName",
						});
					}
				}
			},
		};
	},
});
