import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/commands/${name}.md`,
);

export default ruleCreator({
	name: "no-default-hotkey",
	meta: {
		type: "suggestion" as const,
		docs: {
			description: "Discourage providing default hotkeys for commands.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+setting+default+hotkeys",
		},
		messages: {
			hotkeys:
				"Don't provide a default hotkey, as they might conflict with other hotkeys the user has already set, or that are included with Obsidian by default.",
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
						property.key.name === "hotkeys"
					) {
						context.report({
							node: property,
							messageId: "hotkeys",
						});
					}
				}
			},
		};
	},
});
