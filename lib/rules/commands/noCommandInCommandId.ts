import { TSESLint, TSESTree } from "@typescript-eslint/utils";

export default {
	name: "no-command-in-command-id",
	meta: {
		type: "suggestion" as const,
		docs: {
			description: "Disallow using the word 'command' in a command ID.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		messages: {
			commandInId: "Adding `command` to the command ID is not necessary.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context: TSESLint.RuleContext<"commandInId", []>) {
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
						property.key.name === "id" &&
						property.value.type === "Literal" &&
						typeof property.value.value === "string" &&
						property.value.value.toLowerCase().includes("command")
					) {
						context.report({
							node: property,
							messageId: "commandInId",
						});
					}
				}
			},
		};
	},
};
