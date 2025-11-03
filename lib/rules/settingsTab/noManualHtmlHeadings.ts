import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/settings-tab/${name}.md`,
);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

export default ruleCreator({
	name: "no-manual-html-headings",
	meta: {
		docs: {
			description:
				"Disallow using HTML heading elements for settings headings.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text",
		},
		type: "problem" as const,
		messages: {
			headingEl:
				"For a consistent UI use `new Setting(containerEl).setName(...).setHeading()` instead of creating HTML heading elements directly.",
		},
		schema: [],
		fixable: "code" as const,
	},
	defaultOptions: [],
	create(context) {
		let insidePluginSettingTab = false;

		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (
					node.superClass?.type === "Identifier" &&
					node.superClass.name === "PluginSettingTab"
				) {
					insidePluginSettingTab = true;
				}
			},
			"ClassDeclaration:exit"() {
				insidePluginSettingTab = false;
			},
			CallExpression(node: TSESTree.CallExpression) {
				if (!insidePluginSettingTab) return;

				const callee = node.callee;
				if (
					callee.type !== "MemberExpression" ||
					callee.property.type !== "Identifier" ||
					callee.property.name !== "createEl"
				) {
					return;
				}

				const tagArg = node.arguments[0];
				if (
					!tagArg ||
					tagArg.type !== "Literal" ||
					typeof tagArg.value !== "string" ||
					!HEADING_TAGS.has(tagArg.value)
				) {
					return;
				}

				context.report({
					node,
					messageId: "headingEl",
					fix: (fixer) => {
						const optionsArg = node.arguments[1];
						let textValue = "";
						if (optionsArg?.type === "ObjectExpression") {
							const textProp = optionsArg.properties.find(
								(p): p is TSESTree.Property =>
									p.type === "Property" &&
									(p.key as TSESTree.Identifier).name ===
										"text",
							);
							if (
								textProp?.value.type === "Literal" &&
								typeof textProp.value.value === "string"
							) {
								textValue = textProp.value.value;
							}
						}
						const containerEl = context.sourceCode.getText(
							callee.object,
						);
						return fixer.replaceText(
							node,
							`new Setting(${containerEl}).setName("${textValue}").setHeading()`,
						);
					},
				});
			},
		};
	},
});
