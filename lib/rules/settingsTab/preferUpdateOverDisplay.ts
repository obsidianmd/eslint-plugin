import { TSESTree } from "@typescript-eslint/utils";
import { gte as semverGte } from "semver";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import {
    DECLARATIVE_MIN_VERSION,
    isPluginSettingTab,
    minAppVersionSchema,
    resolveMinAppVersion,
} from "./shared.js";

type Options = [{ minAppVersion?: string }?];

export default ruleCreator<Options, "preferUpdate">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer this.update() over this.display() to refresh a PluginSettingTab on Obsidian 1.13+.",
            url: docsUrl("prefer-update-over-display", "settings-tab"),
        },
        schema: minAppVersionSchema,
        fixable: "code" as const,
        messages: {
            preferUpdate:
                "Call this.update() instead of this.display() to refresh a settings tab. On Obsidian 1.13+, re-calling display() does not refresh declarative settings.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const minAppVersion = resolveMinAppVersion(context);
        // update() is the 1.13 refresh API — don't recommend it to plugins that
        // still target older Obsidian (or whose version we can't determine).
        if (!minAppVersion || !semverGte(minAppVersion, DECLARATIVE_MIN_VERSION)) {
            return {};
        }

        // Track the nearest enclosing class so we only flag `this.display()`
        // that resolves to a PluginSettingTab instance.
        const classStack: boolean[] = [];

        function enterClass(
            node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
        ) {
            classStack.push(isPluginSettingTab(node));
        }
        function exitClass() {
            classStack.pop();
        }

        return {
            ClassDeclaration: enterClass,
            "ClassDeclaration:exit": exitClass,
            ClassExpression: enterClass,
            "ClassExpression:exit": exitClass,
            CallExpression(node: TSESTree.CallExpression) {
                if (!classStack[classStack.length - 1]) {
                    return;
                }
                const callee = node.callee;
                if (
                    callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    callee.computed ||
                    callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
                    callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    callee.property.name !== "display"
                ) {
                    return;
                }
                context.report({
                    node,
                    messageId: "preferUpdate",
                    fix: (fixer) => fixer.replaceText(callee.property, "update"),
                });
            },
        };
    },
});
