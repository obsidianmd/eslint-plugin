import { manifest } from "../../readManifest";

export = {
	name: "no-plugin-name-in-heading",
	meta: {
		docs: {
			description:
				"Don't include a heading with the plugin name in settings",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text",
		},
		type: "problem",
		messages: {
			pluginName:
				"Don't include a heading with the plugin name in settings",
		},
		schema: [],
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		let insidePluginSettingTab = false;
		return {
			ClassDeclaration(node) {
				if (
					node.superClass &&
					node.superClass.name === "PluginSettingTab"
				) {
					insidePluginSettingTab = true;
				}
			},
			"ClassDeclaration:exit"(node) {
				if (insidePluginSettingTab) {
					insidePluginSettingTab = false;
				}
			},
			ExpressionStatement(node) {
				if (
					insidePluginSettingTab &&
					node.expression?.type === "CallExpression"
				) {
					const methods = [];
					let callExpr = node.expression;
					let text = "";

					while (
						callExpr &&
						callExpr.type === "CallExpression" &&
						callExpr.callee &&
						callExpr.callee.property
					) {
						const property = callExpr.callee.property;

						if (property && property.type === "Identifier") {
							const callName = property.name;
							const args = callExpr.arguments;

							if (
								callName === "setName" &&
								args.length > 0 &&
								args[0]?.type === "Literal"
							) {
								methods.push(callName);
								text = args[0].value;
							}

							if (callName === "setHeading") {
								methods.push(callName);
							}

							callExpr = callExpr.callee.object;
						} else {
							break;
						}

						if (
							callExpr?.type === "NewExpression" &&
							callExpr.callee?.type === "Identifier" &&
							callExpr.callee.name === "Setting" &&
							methods.includes("setName") &&
							methods.includes("setHeading")
						) {
							if (
								text
									.toLowerCase()
									.includes(manifest.name.toLowerCase())
							) {
								context.report({
									node,
									messageId: "pluginName",
									fix: (fixer) => fixer.remove(node),
								});
							}
						}
					}
				}
			},
		};
	},
};
