import { ASTUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { staticMemberName } from "../../memberName.js";
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

// "settings" or "options" as what a verb acts on, as in "Export and import
// settings" or "Reset all settings", or with the act after it, as in "Settings
// backup": the heading names what its section does with the plugin's settings,
// and the word is needed for that.
const SETTINGS_VERBS = String.raw`(?:export|import|reset|restore|back\s*up|sync|synchroni[sz]e|copy|save|load|share|transfer|migrate|clear|delete|revert|download|upload)`;
const SETTINGS_ACTS = String.raw`(?:export|import|reset|restore|backup|back-up|sync|synchroni[sz]ation|transfer|migration)`;
const SETTINGS_AS_OBJECT = new RegExp(
    String.raw`(?<![\p{L}\p{N}_])${SETTINGS_VERBS}(?:\s*(?:,|\/|&|\band\b|\bor\b)\s*${SETTINGS_VERBS})*\s+(?:(?:all|your|the|my|plugin|current|default|saved|these)\s+)*(?:settings|options)(?![\p{L}\p{N}_])` +
        String.raw`|(?<![\p{L}\p{N}_])(?:settings|options)\s+${SETTINGS_ACTS}(?:\s*(?:,|\/|&|\band\b|\bor\b)\s*${SETTINGS_ACTS})*(?![\p{L}\p{N}_])`,
    "giu",
);

// The first "settings" or "options" in the heading's name that is not what a
// verb acts on, or undefined when there is none.
function redundantSettingsWord(name: string): string | undefined {
    const covered: [number, number][] = [];
    for (const match of name.matchAll(SETTINGS_AS_OBJECT)) {
        covered.push([match.index, match.index + match[0].length]);
    }
    for (const match of name.matchAll(new RegExp(SETTINGS_WORD.source, "giu"))) {
        const start = match.index;
        if (!covered.some(([from, to]) => start >= from && start < to)) {
            return match[1];
        }
    }
    return undefined;
}

// A heading's name in lower case, with runs of spaces and punctuation as one
// space: "My Plugin:" becomes "my plugin".
function normalizeName(name: string): string {
    return name.replace(/[\s:\-–—|·•.]+/gu, " ").trim().toLowerCase();
}

// A heading's name, without "settings" and "options" and the punctuation and
// spaces around them, in lower case: "General settings:" becomes "general".
// Null when nothing is left.
function headingSubject(name: string): string | null {
    const subject = normalizeName(name.replace(new RegExp(SETTINGS_WORD.source, "giu"), " "));
    return subject === "" ? null : subject;
}

const { DefinitionType } = TSESLint.Scope;

// Calls that leave the tab as it was, so a heading after them is still the
// first thing in it: emptying the container, setting its classes and
// attributes, and logging.
const CALLS_THAT_ADD_NOTHING = new Set([
    "empty",
    "addClass",
    "addClasses",
    "removeClass",
    "removeClasses",
    "toggleClass",
    "setAttr",
    "setAttrs",
    "setAttribute",
    "log",
    "info",
    "warn",
    "error",
    "debug",
]);

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

                const word = redundantSettingsWord(textArg.value);
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
                // The guidelines are about a heading at the top of the tab. One
                // lower down starts a section of its own, and removing it would
                // put that section's settings under the heading before it.
                if (!isFirstInTab(top)) {
                    return;
                }
                const removal = planRemoval(top, calls, settingConstructor);
                if (subject === "general") {
                    reportRemoval(node, "general", removal);
                }
                // The plugin's name is compared whole: "settings" and "options"
                // are left out of the heading, not of the name, so for a plugin
                // named Style Settings a "Style" heading is a section of its own.
                if (
                    typeof pluginName === "string" &&
                    normalizeName(pluginName) !== "" &&
                    (subject === normalizeName(pluginName) || normalizeName(textArg.value) === normalizeName(pluginName))
                ) {
                    reportRemoval(node, "pluginName", removal);
                }
            },
        };

        // Whether the heading whose chain is `top` is the first thing display()
        // adds to the tab: nothing that runs before it in display() may add to
        // the tab. Where the order cannot be told it is not: in a loop, in
        // another function, such as a callback, which may run at any time, or
        // in a method other than display(), which display() may call after
        // adding settings. What runs before display() empties the tab, as
        // `containerEl.empty()` does, is not in it any more.
        function isFirstInTab(top: TSESTree.CallExpression): boolean {
            let current: TSESTree.Node = top;
            let cleared = false;
            for (;;) {
                const parent: TSESTree.Node | undefined = current.parent;
                if (parent === undefined) {
                    return false;
                }
                if (isFunction(parent)) {
                    const member = parent.parent;
                    return (
                        (member?.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                            member?.type === TSESTree.AST_NODE_TYPES.PropertyDefinition) &&
                        member.value === parent &&
                        !member.static &&
                        staticMemberName(member) === "display"
                    );
                }
                if (isLoop(parent)) {
                    return false;
                }
                const start = current.range[0];
                const before = cleared ? [] : children(parent).filter((child) => child.range[1] <= start);
                for (let index = before.length - 1; index >= 0; index--) {
                    if (parent.type === TSESTree.AST_NODE_TYPES.BlockStatement && emptiesTab(before[index])) {
                        cleared = true;
                        break;
                    }
                    if (!addsNothing(before[index])) {
                        return false;
                    }
                }
                current = parent;
            }
        }

        // `containerEl.empty();` or `this.containerEl.empty();`, `containerEl`
        // being the tab's, as `const { containerEl } = this` declares it.
        function emptiesTab(statement: TSESTree.Node): boolean {
            if (statement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement) {
                return false;
            }
            const call = statement.expression;
            return (
                call.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                call.arguments.length === 0 &&
                call.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !call.callee.computed &&
                call.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                call.callee.property.name === "empty" &&
                isTabContainer(call.callee.object)
            );
        }

        function isTabContainer(node: TSESTree.Node): boolean {
            if (node.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                return (
                    node.object.type === TSESTree.AST_NODE_TYPES.ThisExpression &&
                    !node.computed &&
                    node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.property.name === "containerEl"
                );
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
            const [definition] = variable?.defs ?? [];
            if (
                variable?.defs.length !== 1 ||
                definition.type !== DefinitionType.Variable ||
                definition.parent.kind !== "const" ||
                !definition.node.init
            ) {
                return false;
            }
            const { id, init } = definition.node;
            if (id.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return isTabContainer(init);
            }
            // `const { containerEl } = this` or `const { containerEl: el } = this`
            return (
                id.type === TSESTree.AST_NODE_TYPES.ObjectPattern &&
                init.type === TSESTree.AST_NODE_TYPES.ThisExpression &&
                id.properties.some(
                    (property) =>
                        property.type === TSESTree.AST_NODE_TYPES.Property &&
                        !property.computed &&
                        property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
                        property.key.name === "containerEl" &&
                        property.value === definition.name,
                )
            );
        }

        // Whether running `node` leaves the tab as it was: it creates nothing
        // and calls nothing but the methods that add nothing. A function in it
        // only runs when called, so its body does not count.
        function addsNothing(node: TSESTree.Node): boolean {
            if (isFunction(node)) {
                return true;
            }
            switch (node.type) {
                case TSESTree.AST_NODE_TYPES.NewExpression:
                case TSESTree.AST_NODE_TYPES.TaggedTemplateExpression:
                case TSESTree.AST_NODE_TYPES.ImportExpression:
                    return false;
                case TSESTree.AST_NODE_TYPES.CallExpression:
                    if (
                        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                        node.callee.computed ||
                        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                        !CALLS_THAT_ADD_NOTHING.has(node.callee.property.name)
                    ) {
                        return false;
                    }
                    break;
                default:
                    break;
            }
            return children(node).every(addsNothing);
        }

        function children(node: TSESTree.Node): TSESTree.Node[] {
            const result: TSESTree.Node[] = [];
            for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
                const child: unknown = (node as unknown as Record<string, unknown>)[key];
                for (const item of Array.isArray(child) ? child : [child]) {
                    if (isNode(item)) {
                        result.push(item);
                    }
                }
            }
            return result;
        }

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

function isNode(value: unknown): value is TSESTree.Node {
    return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function isFunction(
    node: TSESTree.Node,
): node is TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression {
    return (
        node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration ||
        node.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
        node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression
    );
}

function isLoop(node: TSESTree.Node): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.ForStatement ||
        node.type === TSESTree.AST_NODE_TYPES.ForInStatement ||
        node.type === TSESTree.AST_NODE_TYPES.ForOfStatement ||
        node.type === TSESTree.AST_NODE_TYPES.WhileStatement ||
        node.type === TSESTree.AST_NODE_TYPES.DoWhileStatement
    );
}
