import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import {
    getTypeInfo,
    isDiscardedArrowBody,
    isGlobalWindowAt,
    isResultDiscarded,
    isTimerCallTypeSafe,
    mayLackWindowAt,
    windowIsNarrowedAt,
} from "../globalWindow.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const TIMER_FUNCTIONS = new Set([
    "cancelAnimationFrame",
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);

const ANIMATION_FRAME_FUNCTIONS = new Set(["cancelAnimationFrame", "requestAnimationFrame"]);

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.",
            url: docsUrl("prefer-window-timers"),
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferWindowTimer:
                "Use 'window.{{name}}()' instead of '{{name}}()' for popout window compatibility.",
            noActiveWindowTimer:
                "Use 'window.{{name}}()' instead of 'activeWindow.{{name}}()'. Timer functions should use 'window'.",
            useWindowTimer: "Replace with 'window.{{name}}()'.",
        },
    },
    defaultOptions: [],
    create(context) {
        // Type information when the file has it, for clear*() arguments.
        const types = getTypeInfo(context);

        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Bare timer call: setTimeout() → window.setTimeout()
                if (node.callee.type === TSESTree.AST_NODE_TYPES.Identifier) {
                    const name = node.callee.name;
                    if (!TIMER_FUNCTIONS.has(name)) {
                        return;
                    }

                    // Only flag global references, not local functions
                    const scope = context.sourceCode.getScope(node);
                    const variable = findVariable(scope, name);
                    if (variable && variable.defs.length > 0) {
                        return;
                    }

                    const callee = node.callee;
                    // `window` would be a local of that name, such as a
                    // Playwright page, or would not exist: no DOM lib, or a
                    // `typeof window` check says the code runs without one.
                    // In the `else` of `if ("requestIdleCallback" in window)`,
                    // `window` is `never`, and `window.setTimeout` does not compile.
                    if (!isGlobalWindowAt(context, callee) || windowIsNarrowedAt(context.sourceCode, callee, types)) {
                        context.report({ node: callee, messageId: "preferWindowTimer", data: { name } });
                        return;
                    }
                    const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(callee, `window.${name}`);
                    // With @types/node, the bare functions are Node's: setTimeout()
                    // returns a NodeJS.Timeout and clearTimeout() accepts one, while
                    // window's return and accept a number. The rewrite is applied
                    // only where that cannot change a type; elsewhere it is offered
                    // as a suggestion, since the variable's type may need to change
                    // with it. So is code that may run without a window, such as
                    // the body of `try { … } catch {}`.
                    if (isTimerCallTypeSafe(node, name, types) && !mayLackWindowAt(context, callee)) {
                        context.report({ node: callee, messageId: "preferWindowTimer", data: { name }, fix });
                    } else {
                        context.report({
                            node: callee,
                            messageId: "preferWindowTimer",
                            data: { name },
                            suggest: [{ messageId: "useWindowTimer", data: { name }, fix }],
                        });
                    }
                    return;
                }

                // activeWindow.setTimeout() → window.setTimeout()
                const callee = node.callee;
                if (
                    callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    callee.object.name === "activeWindow" &&
                    callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    TIMER_FUNCTIONS.has(callee.property.name)
                ) {
                    const name = callee.property.name;
                    // A frame callback belongs to the window it paints, so
                    // the active window's is the right one: the main window's
                    // stops while that window is hidden or minimized, as a
                    // popout's user may keep it. Its frame IDs are that
                    // window's too, so cancelAnimationFrame() stays with it.
                    if (ANIMATION_FRAME_FUNCTIONS.has(name)) {
                        return;
                    }
                    const object = callee.object;
                    const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(object, "window");
                    if (!isGlobalWindowAt(context, object) || windowIsNarrowedAt(context.sourceCode, object, types)) {
                        context.report({ node: callee, messageId: "noActiveWindowTimer", data: { name } });
                    } else if (
                        mayLackWindowAt(context, object) ||
                        name.startsWith("clear") ||
                        !(isResultDiscarded(node) || isDiscardedArrowBody(node, types))
                    ) {
                        // A timer ID belongs to the window that set it:
                        // `window.clearTimeout(id)` clears only a timer
                        // `window` set, and the one `activeWindow` set may
                        // still be pending. Only a suggestion, for the code
                        // that sets the timer and the code that clears it to
                        // change together: a setter whose ID is kept, as in
                        // `this.id = activeWindow.setInterval(…)`, may be
                        // cleared by `activeWindow.clearInterval(this.id)`.
                        context.report({
                            node: callee,
                            messageId: "noActiveWindowTimer",
                            data: { name },
                            suggest: [{ messageId: "useWindowTimer", data: { name }, fix }],
                        });
                    } else {
                        context.report({ node: callee, messageId: "noActiveWindowTimer", data: { name }, fix });
                    }
                }
            },
        };

        // A scope's variables by name. Searching its `variables` array instead
        // costs the number of variables in each scope up to the global one,
        // which holds every name of TypeScript's lib, for each timer call.
        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                const variable = current.set.get(name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
