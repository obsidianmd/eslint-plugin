import { manifest } from "../../readManifest";

export = {
	name: "no-html-header-elements",
	meta: {
		docs: {
			description: "Don't use HTML header elements for settings headings",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text",
		},
		type: "problem",
		messages: {
			headingEl: "Don't use HTML header elements for settings headings",
		},
		schema: [],
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				if (node.callee.type === "MemberExpression") {
					if (node.callee.property.name === "createEl") {
						const args = node.arguments;

						const containerObjectName = node.callee.object.name;
						const textProperty = node.arguments[1].properties.find(
							(property) =>
								property.key.value === "text" ||
								property.key.name === "text"
						);
						if (!textProperty) return;
						const textValue = textProperty.value.value;

						if (
							["h1", "h2", "h3", "h4", "h5", "h6"].includes(
								args[0].value
							)
						) {
							context.report({
								node: args[0],
								messageId: "headingEl",
								fix: (fixer) =>
									fixer.replaceText(
										node,
										`new Setting(${containerObjectName}).setName("${textValue}").setHeading()`
									),
							});
						}
					}
				}
			},
		};
	},
};
