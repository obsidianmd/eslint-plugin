import { manifest } from "../../readManifest";

export = {
	name: "hotkeys",
	meta: {
		docs: {
			description: "Discourage providing default hotkeys.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		type: "problem",
		messages: {
			hotkeys:
				"We recommend against providing a default hotkey when possible.",
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
							property.key.name === "hotkeys"
						) {
							context.report({
								node: property,
								messageId: "hotkeys",
							});
						}
					});
				}
			},
		};
	},
};
