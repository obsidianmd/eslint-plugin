import { TSESTree } from "@typescript-eslint/utils";
import { gte as semverGte } from "semver";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import {
    DECLARATIVE_MIN_VERSION,
    findClassMember,
    isPluginSettingTab,
    minAppVersionSchema,
    resolveMinAppVersion,
} from "./shared.js";

type Options = [{ minAppVersion?: string }?];

export default ruleCreator<Options, "deprecatedDisplay">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later.",
            url: docsUrl("no-deprecated-display", "settings-tab"),
        },
        schema: minAppVersionSchema,
        fixable: "code" as const,
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
            // Report on the `display` name so the editor highlights the method
            // identifier precisely rather than underlining the whole body.
            context.report({
                node: display.key,
                messageId: "deprecatedDisplay",
                data: { minAppVersion },
                // display() is fully bypassed once getSettingDefinitions() is
                // present on 1.13+, so removing it is behavior-preserving.
                fix: (fixer) => fixer.removeRange(memberRemovalRange(display)),
            });
        }

        // Range covering the whole member plus its line: leading indentation, a
        // trailing semicolon (class fields), and the trailing newline, so no
        // blank line is left behind.
        function memberRemovalRange(
            member: TSESTree.Node,
        ): readonly [number, number] {
            const sourceCode = context.sourceCode;
            const text = sourceCode.getText();
            let [start, end] = member.range;

            const nextToken = sourceCode.getTokenAfter(member);
            if (nextToken?.value === ";") {
                end = nextToken.range[1];
            }

            const lineStart = text.lastIndexOf("\n", start - 1) + 1;
            if (text.slice(lineStart, start).trim() === "") {
                start = lineStart;
            }

            const trailing = /^[ \t]*\r?\n/.exec(text.slice(end));
            if (trailing) {
                end += trailing[0].length;
            }

            return [start, end];
        }

        return {
            ClassDeclaration: check,
            ClassExpression: check,
        };
    },
});
