import { manifest } from "../../readManifest";

export = {
	name: "pluginName",
	meta: {
		docs: {
			description:
				"Discourage including the plugin name in the command name.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		type: "problem",
		messages: {
			pluginName: "The command name should not include the plugin name.",
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
									.includes(manifest.name.toLowerCase())
							) {
								context.report({
									node: property,
									messageId: "pluginName",
								});
							}
						}
					});
				}
			},
		};
	},
};
