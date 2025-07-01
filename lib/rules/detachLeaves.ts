import { TSESTree, TSESLint, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
	name: "detach-leaves",
	meta: {
		docs: {
			description: "Don't detach leaves in onunload.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Don't+detach+leaves+in+%60onunload%60",
		},
		type: "problem" as const,
		messages: {
			onunload: "Don't detach leaves in onunload.",
		},
		schema: [],
		fixable: "code" as const,
	},
	defaultOptions: [],
	create: (context) => {
		return {
			MethodDefinition(node: TSESTree.MethodDefinition) {
				if (
					node.key.type === "Identifier" &&
					node.key.name === "onunload"
				) {
					if (
						node.value.type === "FunctionExpression" &&
						node.value.body &&
						node.value.body.type === "BlockStatement"
					) {
						node.value.body.body.forEach((statement) => {
							if (
								statement.type === "ExpressionStatement" &&
								statement.expression.type ===
									"CallExpression" &&
								statement.expression.callee.type ===
									"MemberExpression" &&
								statement.expression.callee.property.type ===
									"Identifier" &&
								statement.expression.callee.property.name ===
									"detachLeavesOfType"
							) {
								context.report({
									node,
									messageId: "onunload",
									fix: (fixer) => fixer.remove(statement),
								});
							}
						});
					}
				}
			},
		};
	},
});
