import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { findClassMember, isPluginSettingTab } from "./shared.js";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/settings-tab/${name}.md`,
);

export default ruleCreator({
    name: "prefer-setting-definitions",
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Encourage PluginSettingTab subclasses to implement getSettingDefinitions() so settings appear in Obsidian 1.13+ settings search.",
            url: "https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings",
        },
        schema: [],
        messages: {
            missingSettingDefinitions:
                "This PluginSettingTab does not implement getSettingDefinitions(); its settings will not appear in Obsidian's settings search for users on 1.13.0 or later. Consider adopting the declarative settings API: https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings",
        },
    },
    defaultOptions: [],
    create(context) {
        function check(
            node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
        ) {
            if (node.abstract || !isPluginSettingTab(node)) {
                return;
            }
            if (findClassMember(node, "getSettingDefinitions")) {
                return;
            }
            context.report({
                node: node.id ?? node.superClass ?? node,
                messageId: "missingSettingDefinitions",
            });
        }

        return {
            ClassDeclaration: check,
            ClassExpression: check,
        };
    },
});
