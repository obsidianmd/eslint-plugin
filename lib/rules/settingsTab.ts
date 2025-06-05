import { manifest } from "../readManifest.js";
import { TSESTree, TSESLint } from "@typescript-eslint/utils";

export default {
	name: "settings-tab",
	meta: {
		docs: {
			description:
				"Discourage common anti-patterns in plugin settings tabs.",
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
		let currentDisplayMethodContext: {
			containerElName: string; // Store the identified name of containerEl
		} | null = null;

		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (
					node.superClass &&
					node.superClass.type ===
						TSESTree.AST_NODE_TYPES.Identifier &&
					node.superClass.name === "PluginSettingTab"
				) {
					insidePluginSettingTab = true;
				}
			},
			"ClassDeclaration:exit"(node: TSESTree.ClassDeclaration) {
				if (
					node.superClass &&
					node.superClass.type ===
						TSESTree.AST_NODE_TYPES.Identifier &&
					node.superClass.name === "PluginSettingTab" &&
					insidePluginSettingTab // Only reset if it was this class that set it
				) {
					insidePluginSettingTab = false;
				}
			},
			MethodDefinition(node: TSESTree.MethodDefinition) {
				if (
					insidePluginSettingTab &&
					node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
					node.key.name === "display" &&
					node.value.type ===
						TSESTree.AST_NODE_TYPES.FunctionExpression
				) {
					let cElName = "this.containerEl"; // Default
					if (node.value.body) {
						for (const statement of node.value.body.body) {
							if (
								statement.type ===
									TSESTree.AST_NODE_TYPES
										.VariableDeclaration &&
								statement.declarations.length > 0 &&
								statement.declarations[0].id.type ===
									TSESTree.AST_NODE_TYPES.ObjectPattern &&
								statement.declarations[0].init?.type ===
									TSESTree.AST_NODE_TYPES.ThisExpression
							) {
								const prop =
									statement.declarations[0].id.properties.find(
										(
											p
										): p is TSESTree.Property & {
											value: TSESTree.Identifier;
										} => // Type guard
											p.type ===
												TSESTree.AST_NODE_TYPES
													.Property &&
											p.key.type ===
												TSESTree.AST_NODE_TYPES
													.Identifier &&
											p.key.name === "containerEl" &&
											p.value.type ===
												TSESTree.AST_NODE_TYPES
													.Identifier
									);
								if (prop) {
									cElName = prop.value.name;
									break;
								}
							}
						}
					}
					currentDisplayMethodContext = { containerElName: cElName };
				}
			},
			"MethodDefinition:exit"(node: TSESTree.MethodDefinition) {
				if (
					currentDisplayMethodContext &&
					node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
					node.key.name === "display"
				) {
					currentDisplayMethodContext = null;
				}
			},

			ExpressionStatement(node: TSESTree.ExpressionStatement) {
				if (
					!insidePluginSettingTab ||
					node.expression?.type !==
						TSESTree.AST_NODE_TYPES.CallExpression
				) {
					return;
				}

				const methodsFound: string[] = [];
				let currentText = "";
				let currentChainNode: TSESTree.Expression = node.expression; // Start with the full expression

				// Traverse down the chain of CallExpressions
				let iteration = 0;
				while (
					currentChainNode.type ===
					TSESTree.AST_NODE_TYPES.CallExpression
				) {
					iteration++;
					const callExpr =
						currentChainNode as TSESTree.CallExpression;

					if (
						callExpr.callee.type !==
							TSESTree.AST_NODE_TYPES.MemberExpression ||
						callExpr.callee.property.type !==
							TSESTree.AST_NODE_TYPES.Identifier
					) {
						break;
					}

					const property = callExpr.callee.property;
					const callName = property.name;
					const args = callExpr.arguments;

					if (
						callName === "setName" &&
						args.length > 0 &&
						args[0]?.type === TSESTree.AST_NODE_TYPES.Literal &&
						typeof args[0].value === "string"
					) {
						methodsFound.push(callName);
						currentText = args[0].value;
					} else if (callName === "setHeading") {
						methodsFound.push(callName);
					}

					currentChainNode = callExpr.callee.object; // Move to the next object in the chain
				}

				// After the loop, currentChainNode is the base of the chain (e.g., NewExpression or ThisExpression)

				const baseNewExpression =
					currentChainNode?.type ===
					TSESTree.AST_NODE_TYPES.NewExpression
						? currentChainNode
						: null;

				if (
					baseNewExpression &&
					baseNewExpression.callee.type ===
						TSESTree.AST_NODE_TYPES.Identifier &&
					baseNewExpression.callee.name === "Setting" &&
					methodsFound.includes("setName") && // Order doesn't matter, just presence
					methodsFound.includes("setHeading")
				) {
					let isTargetSettingInstance = false;
					if (baseNewExpression.arguments.length > 0) {
						const arg0 = baseNewExpression.arguments[0];

						// Check for `this.containerEl`
						if (
							arg0.type ===
								TSESTree.AST_NODE_TYPES.MemberExpression &&
							arg0.object.type ===
								TSESTree.AST_NODE_TYPES.ThisExpression &&
							arg0.property.type ===
								TSESTree.AST_NODE_TYPES.Identifier &&
							arg0.property.name === "containerEl"
						) {
							isTargetSettingInstance = true;
						}
						// Check for destructured containerEl if in display() method
						else if (
							currentDisplayMethodContext &&
							arg0.type === TSESTree.AST_NODE_TYPES.Identifier &&
							arg0.name ===
								currentDisplayMethodContext.containerElName
						) {
							isTargetSettingInstance = true;
						}
					}

					if (!isTargetSettingInstance) {
						return;
					}

					const textToTest = currentText.toLowerCase();
					const settingKeywords = [
						"settings",
						"options",
						"configuration",
						"config",
					];
					if (
						settingKeywords.some((str) => textToTest.includes(str))
					) {
						context.report({
							node: node,
							messageId: "settings",
							fix: (fixer) => fixer.remove(node),
						});
					}
					if (textToTest.includes("general")) {
						context.report({
							node: node,
							messageId: "general",
							fix: (fixer) => fixer.remove(node),
						});
					}
					if (
						manifest?.name &&
						textToTest.includes(manifest.name.toLowerCase())
					) {
						context.report({
							node: node,
							messageId: "pluginName",
							fix: (fixer) => fixer.remove(node),
						});
					}
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				if (!insidePluginSettingTab) return; // Only apply if inside the correct class

				if (
					node.callee.type ===
						TSESTree.AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type ===
						TSESTree.AST_NODE_TYPES.Identifier &&
					node.callee.property.name === "createEl"
				) {
					let isTargetContainer = false;
					const calleeObj = node.callee.object;

					if (currentDisplayMethodContext) {
						// createEl checks are typically within display()
						if (
							calleeObj.type ===
								TSESTree.AST_NODE_TYPES.Identifier &&
							calleeObj.name ===
								currentDisplayMethodContext.containerElName
						) {
							isTargetContainer = true;
						}
					} else {
						// Fallback for constructor or other methods, less common for createEl for headings
						if (
							calleeObj.type ===
								TSESTree.AST_NODE_TYPES.MemberExpression &&
							calleeObj.object.type ===
								TSESTree.AST_NODE_TYPES.ThisExpression &&
							calleeObj.property.type ===
								TSESTree.AST_NODE_TYPES.Identifier &&
							calleeObj.property.name === "containerEl"
						) {
							isTargetContainer = true;
						}
					}

					if (!isTargetContainer) return;

					const args = node.arguments;
					let textValue = "";

					if (
						args.length > 1 &&
						args[1]?.type ===
							TSESTree.AST_NODE_TYPES.ObjectExpression
					) {
						const textProperty = args[1].properties.find(
							(
								property
							): property is TSESTree.Property & {
								value: TSESTree.Literal & { value: string };
							} =>
								property.type ===
									TSESTree.AST_NODE_TYPES.Property &&
								((property.key.type ===
									TSESTree.AST_NODE_TYPES.Literal &&
									property.key.value === "text") ||
									(property.key.type ===
										TSESTree.AST_NODE_TYPES.Identifier &&
										property.key.name === "text")) &&
								property.value.type ===
									TSESTree.AST_NODE_TYPES.Literal &&
								typeof property.value.value === "string"
						);
						if (textProperty) {
							textValue = textProperty.value.value;
						}
					}

					if (
						args.length > 0 &&
						args[0]?.type === TSESTree.AST_NODE_TYPES.Literal &&
						typeof args[0].value === "string" &&
						["h1", "h2", "h3", "h4", "h5", "h6"].includes(
							args[0].value
						)
					) {
						context.report({
							node: args[0],
							messageId: "headingEl",
							fix: (fixer) => {
								const containerName =
									currentDisplayMethodContext?.containerElName ||
									"this.containerEl";
								return fixer.replaceText(
									node,
									`new Setting(${containerName}).setName("${textValue}").setHeading()`
								);
							},
						});
					}
				}
			},
		};
	},
};
