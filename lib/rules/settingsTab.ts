import { manifest } from "../readManifest.js";
import { TSESTree, TSESLint } from "@typescript-eslint/utils";

export default {
	name: "settings-tab",
	meta: {
		docs: {
			description: "",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text",
		},
		type: "problem" as const,
		messages: {
			settings: 'Avoid "settings" in settings headings',
			general: 'Don\'t use a "general" heading in your settings',
			pluginName:
				"Don't include a heading with the plugin name in settings",
			headingEl: "Don't use HTML header elements for settings headings",
		},
		schema: [],
		fixable: "code" as const,
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<
			"settings" | "general" | "pluginName" | "headingEl",
			[]
		>
	) {
		let insidePluginSettingTab = false;
		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				// Check if the class extends `PluginSettingTab`
				if (
					node.superClass &&
					node.superClass.type === "Identifier" &&
					node.superClass.name === "PluginSettingTab"
				) {
					insidePluginSettingTab = true;
				}
			},
			"ClassDeclaration:exit"(node: TSESTree.ClassDeclaration) {
				if (insidePluginSettingTab) {
					insidePluginSettingTab = false;
				}
			},

			ExpressionStatement(node: TSESTree.ExpressionStatement) {
				if (
					insidePluginSettingTab &&
					node.expression?.type === "CallExpression"
				) {
					const methods = [];
					let callExpr = node.expression;
					let text = "";

					let lastCallExpr = callExpr;
					while (
						callExpr &&
						callExpr.type === "CallExpression" &&
						callExpr.callee &&
						callExpr.callee.type === "MemberExpression" &&
						callExpr.callee.property &&
						callExpr.callee.property.type === "Identifier"
					) {
						const property = callExpr.callee.property;
						const callName = property.name;
						const args = callExpr.arguments;

						if (
							callName === "setName" &&
							args.length > 0 &&
							args[0]?.type === "Literal" &&
							typeof args[0].value === "string"
						) {
							methods.push(callName);
							text = args[0].value;
						}

						if (callName === "setHeading") {
							methods.push(callName);
						}

						if (
							callExpr.callee.object &&
							callExpr.callee.object.type === "CallExpression"
						) {
							lastCallExpr = callExpr;
							callExpr = callExpr.callee.object;
						} else {
							break;
						}
					}
					// After the loop, check if the final callee.object is a NewExpression
					if (
						lastCallExpr &&
						lastCallExpr.callee &&
						lastCallExpr.callee.type === "MemberExpression" &&
						lastCallExpr.callee.object &&
						lastCallExpr.callee.object.type === "NewExpression" &&
						lastCallExpr.callee.object.callee &&
						lastCallExpr.callee.object.callee.type ===
							"Identifier" &&
						lastCallExpr.callee.object.callee.name === "Setting" &&
						methods.includes("setName") &&
						methods.includes("setHeading")
					) {
						if (
							typeof text === "string" &&
							[
								"settings",
								"options",
								"configuration",
								"config",
							].some((str) => text.toLowerCase().includes(str))
						) {
							context.report({
								node,
								messageId: "settings",
								fix: (fixer) => fixer.remove(node),
							});
						}
						if (
							typeof text === "string" &&
							text.toLowerCase().includes("general")
						) {
							context.report({
								node,
								messageId: "general",
								fix: (fixer) => fixer.remove(node),
							});
						}
						if (
							typeof text === "string" &&
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
			},

			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.property.type === "Identifier" &&
					node.callee.property.name === "createEl"
				) {
					const args = node.arguments;
					let containerObjectName = "";
					if (node.callee.object.type === "Identifier") {
						containerObjectName = node.callee.object.name;
					}
					let textValue = "";
					if (
						node.arguments.length > 1 &&
						node.arguments[1].type === "ObjectExpression"
					) {
						const textProperty = node.arguments[1].properties.find(
							(property) =>
								property.type === "Property" &&
								((property.key.type === "Literal" &&
									property.key.value === "text") ||
									(property.key.type === "Identifier" &&
										property.key.name === "text"))
						);
						if (
							textProperty &&
							textProperty.type === "Property" &&
							textProperty.value.type === "Literal" &&
							typeof textProperty.value.value === "string"
						) {
							textValue = textProperty.value.value;
						}
					}
					if (
						args.length > 0 &&
						args[0].type === "Literal" &&
						typeof args[0].value === "string" &&
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
			},
		};
	},
};
