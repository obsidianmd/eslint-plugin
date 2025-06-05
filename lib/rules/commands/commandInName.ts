import { manifest } from "../../readManifest";

export = {
	name: "commandInName",
	meta: {
		docs: {
			description: "Discourage adding `command` to the command name.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		type: "problem",
		messages: {
			commandInName:
				"Adding `command` to the command name is not necessary.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.property.name === "addCommand" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === "ObjectExpression"
				) {
					const argument = node.arguments[0];

					argument.properties.forEach((property) => {
						if (
							property.key.type === "Identifier" &&
							property.key.name === "name" &&
							property.value.type === "Literal"
						) {
							if (
								property.value.value
									.toLowerCase()
									.includes("command")
							) {
								context.report({
									node: property,
									messageId: "commandInName",
								});
							}
						}
					});
				}
			},
		};
	},
};
