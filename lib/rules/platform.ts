import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const BANNED_PROPERTIES = new Set(["userAgent", "platform"]);

export default ruleCreator({
	name: "platform",
	meta: {
		type: "problem" as const,
		docs: {
			description: "Disallow use of navigator API for OS detection",
			url: "https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific+features",
		},
		schema: [],
		messages: {
			avoidNavigator:
				"Avoid using the navigator API to detect the operating system. Use the Platform API instead.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			MemberExpression(node: TSESTree.MemberExpression) {
				const property = node.property;
				if (
					property.type !== "Identifier" ||
					!BANNED_PROPERTIES.has(property.name)
				) {
					return;
				}

				const object = node.object;

				// Case 1: `navigator.userAgent` or `navigator.platform`
				if (
					object.type === "Identifier" &&
					object.name === "navigator"
				) {
					context.report({
						node,
						messageId: "avoidNavigator",
					});
					return;
				}

				// Case 2: `window.navigator.userAgent` or `window.navigator.platform`
				if (
					object.type === "MemberExpression" &&
					object.object.type === "Identifier" &&
					object.object.name === "window" &&
					object.property.type === "Identifier" &&
					object.property.name === "navigator"
				) {
					context.report({
						node,
						messageId: "avoidNavigator",
					});
				}
			},
		};
	},
});
