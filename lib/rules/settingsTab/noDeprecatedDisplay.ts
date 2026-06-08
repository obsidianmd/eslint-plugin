import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import { gte as semverGte } from "semver";
import {
    DECLARATIVE_MIN_VERSION,
    findClassMember,
    isPluginSettingTab,
    minAppVersionSchema,
    resolveMinAppVersion,
} from "./shared.js";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/settings-tab/${name}.md`,
);

type Options = [{ minAppVersion?: string }?];

export default ruleCreator<Options, "deprecatedDisplay">({
    name: "no-deprecated-display",
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later.",
            url: "https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings",
        },
        schema: minAppVersionSchema,
        messages: {
            deprecatedDisplay:
                "minAppVersion is {{minAppVersion}} and getSettingDefinitions() is implemented, so this display() method is deprecated and bypassed by Obsidian. You can remove it.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const minAppVersion = resolveMinAppVersion(context);
        // Only relevant once declarative settings are guaranteed available.
        if (!minAppVersion || !semverGte(minAppVersion, DECLARATIVE_MIN_VERSION)) {
            return {};
        }

        function check(
            node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
        ) {
            if (node.abstract || !isPluginSettingTab(node)) {
                return;
            }
            // display() is only dead code once getSettingDefinitions() exists to
            // take over rendering — otherwise display() is still doing the work.
            if (!findClassMember(node, "getSettingDefinitions")) {
                return;
            }
            const display = findClassMember(node, "display");
            if (!display) {
                return;
            }
            context.report({
                node: display,
                messageId: "deprecatedDisplay",
                data: { minAppVersion },
            });
        }

        return {
            ClassDeclaration: check,
            ClassExpression: check,
        };
    },
});
