import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { findClassMember, isPluginSettingTab } from "./shared.js";

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Encourage PluginSettingTab subclasses to implement getSettingDefinitions() so settings appear in Obsidian 1.13+ settings search.",
            url: docsUrl("prefer-setting-definitions", "settings-tab"),
        },
        schema: [],
        messages: {
            missingSettingDefinitions:
                "This PluginSettingTab does not implement getSettingDefinitions(); its settings will not appear in Obsidian's settings search for users on 1.13.0 or later. Consider adopting the declarative settings API.",
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
