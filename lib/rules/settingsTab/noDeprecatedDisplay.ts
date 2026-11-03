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

export default ruleCreator<Options, "deprecatedDisplay" | "removeDisplay">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later.",
            url: docsUrl("no-deprecated-display", "settings-tab"),
        },
        schema: minAppVersionSchema,
        hasSuggestions: true as const,
        messages: {
            deprecatedDisplay:
                "minAppVersion is {{minAppVersion}} and getSettingDefinitions() is implemented, so this display() method is deprecated and bypassed by Obsidian. You can remove it.",
            removeDisplay: "Remove the display() method.",
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
            const definitions = findClassMember(node, "getSettingDefinitions");
            if (!definitions || returnsNoDefinitions(definitions)) {
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
                // Only a suggestion, never an autofix: obsidian typings older
                // than 1.13 declare display() abstract, so the class stops
                // compiling without it; Obsidian still calls display() whenever
                // getSettingDefinitions() returns an empty array, which it may
                // do conditionally; and the imports, helpers and fields only
                // display() used are left behind unused.
                suggest: [
                    {
                        messageId: "removeDisplay",
                        fix: (fixer) => fixer.removeRange(memberRemovalRange(display)),
                    },
                ],
            });
        }

        // Range covering the whole member plus its line: leading indentation, a
        // trailing semicolon (class fields), a trailing `//` comment when the
        // member has its line to itself, and the trailing newline, so no blank
        // line or orphaned comment is left behind.
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
            const ownLine = text.slice(lineStart, start).trim() === "";
            if (ownLine) {
                start = lineStart;
            }

            const trailing = (ownLine ? /^[ \t]*(?:\/\/[^\r\n]*)?\r?\n/ : /^[ \t]*\r?\n/).exec(
                text.slice(end),
            );
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

/**
 * Whether getSettingDefinitions() is a stub that only returns an empty array
 * (`return [];`, or `() => []`), typically added to satisfy
 * prefer-setting-definitions. Obsidian renders a tab declaratively only when
 * the array is non-empty, so display() is still what renders this one.
 */
function returnsNoDefinitions(
    member: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
): boolean {
    const fn = member.value;
    if (
        fn?.type !== TSESTree.AST_NODE_TYPES.FunctionExpression &&
        fn?.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression
    ) {
        return false;
    }
    if (fn.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
        return isEmptyLiteral(fn.body);
    }
    const statements = fn.body.body;
    return (
        statements.length === 1 &&
        statements[0].type === TSESTree.AST_NODE_TYPES.ReturnStatement &&
        statements[0].argument !== null &&
        isEmptyLiteral(statements[0].argument)
    );
}

// `[]`, or `{}` (no `length`, so also never rendered declaratively), seen
// through a type assertion such as `[] as SettingDefinitionItem[]`.
function isEmptyLiteral(node: TSESTree.Expression): boolean {
    let expression = node;
    while (
        expression.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
        expression.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
        expression.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
        expression.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression
    ) {
        expression = expression.expression;
    }
    return (
        (expression.type === TSESTree.AST_NODE_TYPES.ArrayExpression && expression.elements.length === 0) ||
        (expression.type === TSESTree.AST_NODE_TYPES.ObjectExpression && expression.properties.length === 0)
    );
}
