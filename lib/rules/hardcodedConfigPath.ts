import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
	name: "hardcoded-config-path",
	meta: {
		docs: {
			description: "test",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		type: "problem" as const,
		messages: {
			configPath:
				"Obsidian's configuration folder is not necessarily `.obsidian`, it can be configured by the user.",
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			Literal(node: TSESTree.Literal) {
				if (
					typeof node.value === "string" &&
					node.value.includes(".obsidian")
				) {
					context.report({
						node,
						messageId: "configPath",
					});
				}
			},
		};
	},
});
