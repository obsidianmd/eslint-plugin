import { TSESTree } from "@typescript-eslint/utils";
import { lt as semverLt } from "semver";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import {
    DECLARATIVE_MIN_VERSION,
    findClassMember,
    isPluginSettingTab,
    minAppVersionSchema,
    resolveMinAppVersion,
} from "./shared.js";

type Options = [{ minAppVersion?: string }?];

export default ruleCreator<Options, "missingDisplay">({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Require a display() method on PluginSettingTab subclasses when minAppVersion is below 1.13.0.",
            url: docsUrl("require-display", "settings-tab"),
        },
        schema: minAppVersionSchema,
        messages: {
            missingDisplay:
                "minAppVersion is {{minAppVersion}} (below 1.13.0), but this PluginSettingTab has no display() method, so its settings will not render on Obsidian before 1.13. Implement display(), or raise minAppVersion to 1.13.0.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const minAppVersion = resolveMinAppVersion(context);
        // No-op when the version is unknown or not below 1.13 — we can't assert
        // that display() is required.
        if (!minAppVersion || !semverLt(minAppVersion, DECLARATIVE_MIN_VERSION)) {
            return {};
        }

        function check(
            node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
        ) {
            if (node.abstract || !isPluginSettingTab(node)) {
                return;
            }
            if (findClassMember(node, "display")) {
                return;
            }
            context.report({
                node: node.id ?? node.superClass ?? node,
                messageId: "missingDisplay",
                data: { minAppVersion },
            });
        }

        return {
            ClassDeclaration: check,
            ClassExpression: check,
        };
    },
});
