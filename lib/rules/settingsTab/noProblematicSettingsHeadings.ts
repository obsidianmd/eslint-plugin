import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { manifest } from "../../readManifest.js";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/settings-tab/${name}.md`,
);

export default ruleCreator({
	name: "no-problematic-settings-headings",
	meta: {
		docs: {
			description: "Discourage anti-patterns in settings headings.",
			url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text",
		},
		type: "problem" as const,
		messages: {
			settings: 'Avoid using "settings" in settings headings.',
			general: 'Avoid using a "General" heading in settings.',
			pluginName: "Avoid including the plugin name in settings headings.",
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
			// Find `new Setting(...).setName("...").setHeading()`
			"CallExpression[callee.property.name='setHeading']"(
				node: TSESTree.CallExpression,
			) {
				if (!insidePluginSettingTab) return;

				let setNameCall: TSESTree.CallExpression | null = null;
				let settingConstructor: TSESTree.NewExpression | null = null;
				let current = node.callee as TSESTree.MemberExpression;

				// Traverse the call chain to find setName and the constructor
				while (current.object.type === "CallExpression") {
					const innerCall = current.object;
					if (
						innerCall.callee.type === "MemberExpression" &&
						innerCall.callee.property.type === "Identifier" &&
						innerCall.callee.property.name === "setName"
					) {
						setNameCall = innerCall;
					}
					current = innerCall.callee as TSESTree.MemberExpression;
				}

				if (
					current.object.type === "NewExpression" &&
					(current.object.callee as TSESTree.Identifier).name ===
						"Setting"
				) {
					settingConstructor = current.object;
				}

				if (!setNameCall || !settingConstructor) return;

				const textArg = setNameCall.arguments[0];
				if (
					textArg?.type !== "Literal" ||
					typeof textArg.value !== "string"
				) {
					return;
				}

				const text = textArg.value.toLowerCase();

				if (text.includes("settings") || text.includes("options")) {
					context.report({ node, messageId: "settings" });
				}
				if (text.includes("general")) {
					context.report({ node, messageId: "general", fix: (fixer) => {
						return fixer.remove(node);
					} });
				}
				if (
					manifest.name &&
					text.includes(manifest.name.toLowerCase())
				) {
					context.report({ node, messageId: "pluginName", fix: (fixer) => {
						return fixer.remove(node);
					} });
				}
			},
		};
	},
});
