import { TSESLint, TSESTree } from "@typescript-eslint/utils";

export default {
	name: "no-default-hotkey",
	meta: {
		type: "suggestion" as const,
		docs: {
			description: "Discourage providing default hotkeys for commands.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+setting+default+hotkeys",
		},
		messages: {
			hotkeys:
				"Avoid providing a default hotkey. Users should set their own.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context: TSESLint.RuleContext<"hotkeys", []>) {
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
};
