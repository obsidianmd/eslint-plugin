import { manifest } from "../../readManifest";

export = {
	name: "pluginId",
	meta: {
		docs: {
			description:
				"Discourage including the plugin ID in the command ID.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands",
		},
		type: "problem",
		messages: {
			pluginId: "The command ID should not include the plugin ID.",
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
							property.key.name === "id" &&
							property.value.type === "Literal"
						) {
							if (property.value.value.includes(manifest.id)) {
								context.report({
									node: property,
									messageId: "pluginId",
								});
							}
						}
					});
				}
			},
		};
	},
};
