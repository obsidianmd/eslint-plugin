import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { isPluginSettingTab } from "./shared.js";

type Options = [{ pluginName?: string }?];

// Calls that only shape how the heading looks. A statement made of these and
// nothing else is just the heading, so removing it is the fix.
const HEADING_ONLY_METHODS = new Set(["setName", "setHeading", "setClass"]);
// Calls whose content goes with the heading, such as its description. With one
// of these the removal is a suggestion. Any other call, such as addButton(),
// keeps the statement from being removed at all.
const REMOVABLE_METHODS = new Set([...HEADING_ONLY_METHODS, "setDesc", "setTooltip", "setDisabled"]);

// "settings" or "options" as a word of its own, in any case: not "subsettings".
const SETTINGS_WORD = /(?<![\p{L}\p{N}_])(settings|options)(?![\p{L}\p{N}_])/iu;

// A heading's name, without "settings" and "options" and the punctuation and
// spaces around them, in lower case: "General settings:" becomes "general".
// Null when nothing is left.
function headingSubject(name: string): string | null {
    const subject = name
        .replace(new RegExp(SETTINGS_WORD.source, "giu"), " ")
        .replace(/[\s:\-–—|·•.]+/gu, " ")
        .trim()
        .toLowerCase();
    return subject === "" ? null : subject;
}

// How the removal of the heading is offered, and, for the suggestion's
// description, the calls it removes that are more than the heading.
interface Removal {
    offer: "fix" | "suggest";
    fix: TSESLint.ReportFixFunction;
    including: string;
}

export default ruleCreator<Options, "settings" | "general" | "pluginName" | "removeHeading">({
    meta: {
        docs: {
            description: "Discourage anti-patterns in settings headings.",
            url: docsUrl("no-problematic-settings-headings", "settings-tab"),
        },
        type: "problem" as const,
        messages: {
            settings: 'Avoid using "{{word}}" in settings headings.',
            general: 'Avoid using a "General" heading in settings.',
            pluginName: "Avoid including the plugin name in settings headings.",
            removeHeading:
                "Remove the whole heading setting: the `new Setting(…)` statement and every call in it{{including}}.",
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
        // For each enclosing class, whether it is a settings tab. The nearest one
        // decides: a class nested in a tab is checked on its own terms, and the
        // tab is checked again after it. Functions do not count, so a callback or
        // a nested function in the tab is in the tab.
        const classStack: boolean[] = [];
        const enterClass = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
            classStack.push(isPluginSettingTab(node));
        };
        const exitClass = () => {
            classStack.pop();
        };

        return {
            ClassDeclaration: enterClass,
            "ClassDeclaration:exit": exitClass,
            ClassExpression: enterClass,
            "ClassExpression:exit": exitClass,
            // Find `new Setting(...).setName("...").setHeading()`
            "CallExpression[callee.property.name='setHeading']"(
                node: TSESTree.CallExpression,
            ) {
                if (!classStack.at(-1)) return;

                // The whole chain the heading is part of, from `new Setting(…)` to
                // its last call, which may come after setHeading().
                const top = chainTop(node);
                const chain = chainCalls(top);
                if (!chain) return;
                const { calls, settingConstructor } = chain;
                // The heading's name: each setName() replaces the one before, so it
                // is the last one in the chain, before or after setHeading().
                const setNameCall = calls.find((call) => call.name === "setName")?.node;

                if (!setNameCall || !settingConstructor) return;

                const textArg = setNameCall.arguments[0];
                if (
                    textArg?.type !== TSESTree.AST_NODE_TYPES.Literal ||
                    typeof textArg.value !== "string"
                ) {
                    return;
                }

                const word = SETTINGS_WORD.exec(textArg.value)?.[1];
                if (word !== undefined) {
                    context.report({ node, messageId: "settings", data: { word: word.toLowerCase() } });
                }
                // A heading that is only "General" or the plugin's name, with or
                // without "settings" or "options", as the plugin guidelines
                // describe. One that has the word among others, such as
                // "General appearance" or "Inline Numerals" for a plugin named
                // Numerals, names a section of its own.
                const subject = headingSubject(textArg.value);
                if (subject === null) {
                    return;
                }
                const removal = planRemoval(top, calls, settingConstructor);
                if (subject === "general") {
                    reportRemoval(node, "general", removal);
                }
                if (typeof pluginName === "string" && pluginName !== "" && subject === headingSubject(pluginName)) {
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
                    suggest: [{ messageId: "removeHeading", data: { including: removal.including }, fix: removal.fix }],
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
            // The description, tooltip or disabled state that goes with it, in
            // the order written (`calls` is outermost first).
            const extra = [...new Set(
                calls
                    .map((call) => call.name)
                    .filter((name): name is string => name !== null && !HEADING_ONLY_METHODS.has(name))
                    .reverse(),
            )].map((name) => `\`${name}()\``);
            const including = extra.length === 0
                ? ""
                : `, including ${extra.length === 1 ? extra[0] : `${extra.slice(0, -1).join(", ")} and ${extra.at(-1)}`}`;
            return {
                offer: headingOnly ? "fix" : "suggest",
                fix: (fixer) => fixer.replaceText(statement, ";"),
                including,
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
