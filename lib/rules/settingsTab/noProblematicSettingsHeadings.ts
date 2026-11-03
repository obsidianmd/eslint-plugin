import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

type Options = [{ pluginName?: string }?];

// Calls that only shape how the heading looks. A statement made of these and
// nothing else is just the heading, so removing it is the fix.
const HEADING_ONLY_METHODS = new Set(["setName", "setHeading", "setClass"]);
// Calls whose content goes with the heading, such as its description. With one
// of these the removal is a suggestion. Any other call, such as addButton(),
// keeps the statement from being removed at all.
const REMOVABLE_METHODS = new Set([...HEADING_ONLY_METHODS, "setDesc", "setTooltip", "setDisabled"]);

// How the removal of the heading is offered.
interface Removal {
    offer: "fix" | "suggest";
    fix: TSESLint.ReportFixFunction;
}

export default ruleCreator<Options, "settings" | "general" | "pluginName" | "removeHeading">({
    meta: {
        docs: {
            description: "Discourage anti-patterns in settings headings.",
            url: docsUrl("no-problematic-settings-headings", "settings-tab"),
        },
        type: "problem" as const,
        messages: {
            settings: 'Avoid using "settings" in settings headings.',
            general: 'Avoid using a "General" heading in settings.',
            pluginName: "Avoid including the plugin name in settings headings.",
            removeHeading: "Remove this heading.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    pluginName: {
                        type: "string",
                        description: "The plugin name to check against. Defaults to manifest.json name.",
                    },
                },
                additionalProperties: false,
            },
        ],
        fixable: "code" as const,
        hasSuggestions: true as const,
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const pluginName = options.pluginName ?? getManifest()?.name;
        let insidePluginSettingTab = false;

        return {
            ClassDeclaration(node: TSESTree.ClassDeclaration) {
                if (
                    node.superClass?.type === TSESTree.AST_NODE_TYPES.Identifier &&
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

                // The whole chain the heading is part of, from `new Setting(…)` to
                // its last call, which may come after setHeading().
                const top = chainTop(node);
                const chain = chainCalls(top);
                if (!chain) return;
                const { calls, settingConstructor } = chain;
                // The setName() nearest to the constructor, below setHeading().
                const below = calls.slice(calls.findIndex((call) => call.node === node));
                const setNameCall = below.reverse().find((call) => call.name === "setName")?.node;

                if (!setNameCall || !settingConstructor) return;

                const textArg = setNameCall.arguments[0];
                if (
                    textArg?.type !== TSESTree.AST_NODE_TYPES.Literal ||
                    typeof textArg.value !== "string"
                ) {
                    return;
                }

                const text = textArg.value.toLowerCase();

                if (text.includes("settings") || text.includes("options")) {
                    context.report({ node, messageId: "settings" });
                }
                const removal = planRemoval(top, calls, settingConstructor);
                if (text.includes("general")) {
                    reportRemoval(node, "general", removal);
                }
                if (
                    pluginName &&
                    text.includes(pluginName.toLowerCase())
                ) {
                    reportRemoval(node, "pluginName", removal);
                }
            },
        };

        function reportRemoval(
            node: TSESTree.CallExpression,
            messageId: "general" | "pluginName",
            removal: Removal | null,
        ) {
            if (removal?.offer === "fix") {
                context.report({ node, messageId, fix: removal.fix });
            } else if (removal?.offer === "suggest") {
                context.report({
                    node,
                    messageId,
                    suggest: [{ messageId: "removeHeading", fix: removal.fix }],
                });
            } else {
                context.report({ node, messageId });
            }
        }

        // The removal of the heading's statement. It needs the chain to be the
        // whole statement: removing part of a chain, or a value that is used,
        // leaves code that does not parse. The statement becomes an empty one,
        // which is valid wherever a statement is, also as the body of an `if`, and
        // keeps the statements around it apart when they rely on ASI. It is a fix
        // only when it removes nothing but the heading, and no side effect of an
        // argument.
        function planRemoval(
            top: TSESTree.CallExpression,
            calls: ChainCall[],
            settingConstructor: TSESTree.NewExpression,
        ): Removal | null {
            const statement = top.parent;
            if (statement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement || statement.expression !== top) {
                return null;
            }
            if (!calls.every((call) => call.name !== null && REMOVABLE_METHODS.has(call.name))) {
                return null;
            }
            const headingOnly =
                calls.every(
                    (call) =>
                        call.name !== null &&
                        HEADING_ONLY_METHODS.has(call.name) &&
                        call.node.arguments.every(isPure),
                ) && settingConstructor.arguments.every(isPure);
            return {
                offer: headingOnly ? "fix" : "suggest",
                fix: (fixer) => fixer.replaceText(statement, ";"),
            };
        }
    },
});

interface ChainCall {
    // The method name, null for a computed one.
    name: string | null;
    node: TSESTree.CallExpression;
}

// The outermost call of the method chain `node` is in.
function chainTop(node: TSESTree.CallExpression): TSESTree.CallExpression {
    let top = node;
    while (
        top.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        top.parent.object === top &&
        top.parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
        top.parent.parent.callee === top.parent
    ) {
        top = top.parent.parent;
    }
    return top;
}

// The method calls of the chain ending in `top`, outermost first, and the
// `new Setting(…)` it starts from, or null when it does not start from one. Null
// when a call in it is not a method call, as in `getSetting().setHeading()`.
function chainCalls(
    top: TSESTree.CallExpression,
): { calls: ChainCall[]; settingConstructor: TSESTree.NewExpression | null } | null {
    const calls: ChainCall[] = [];
    let current: TSESTree.Expression = top;
    while (current.type === TSESTree.AST_NODE_TYPES.CallExpression) {
        const callee: TSESTree.Expression = current.callee;
        if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
            return null;
        }
        const name =
            !callee.computed && callee.property.type === TSESTree.AST_NODE_TYPES.Identifier
                ? callee.property.name
                : null;
        calls.push({ name, node: current });
        current = callee.object;
    }
    const settingConstructor =
        current.type === TSESTree.AST_NODE_TYPES.NewExpression &&
        current.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
        current.callee.name === "Setting"
            ? current
            : null;
    return { calls, settingConstructor };
}

// An argument whose evaluation has no side effect, so dropping it changes nothing
// but the heading.
function isPure(node: TSESTree.Node): boolean {
    switch (node.type) {
        case TSESTree.AST_NODE_TYPES.Literal:
        case TSESTree.AST_NODE_TYPES.Identifier:
        case TSESTree.AST_NODE_TYPES.ThisExpression:
            return true;
        case TSESTree.AST_NODE_TYPES.TemplateLiteral:
            return node.expressions.every(isPure);
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return !node.computed && isPure(node.object);
        default:
            return false;
    }
}
