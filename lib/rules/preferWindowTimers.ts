import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const TIMER_FUNCTIONS = new Set([
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);

const CLEAR_FUNCTIONS = new Set(["clearInterval", "clearTimeout"]);
const SET_FUNCTIONS = new Set(["setInterval", "setTimeout"]);

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
        // Type information when the file has it: only clear*() arguments need it.
        const services = context.sourceCode.parserServices;
        const program = services?.program;

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
                    const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(callee, `window.${name}`);
                    // With @types/node, the bare functions are Node's: setTimeout()
                    // returns a NodeJS.Timeout and clearTimeout() accepts one, while
                    // window's return and accept a number. The rewrite is applied
                    // only where that cannot change a type; elsewhere it is offered
                    // as a suggestion, since the variable's type may need to change
                    // with it.
                    if (isTypeSafeRewrite(node, name)) {
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
                    context.report({
                        node: callee,
                        messageId: "noActiveWindowTimer",
                        data: { name },
                        fix(fixer) {
                            return fixer.replaceText(callee.object, "window");
                        },
                    });
                }
            },
        };

        // Whether `window.<name>(...)` keeps every type the bare call had.
        function isTypeSafeRewrite(node: TSESTree.CallExpression, name: string): boolean {
            if (SET_FUNCTIONS.has(name)) {
                // The NodeJS.Timeout it returned becomes a number, which only
                // matters when the value is used.
                return isResultDiscarded(node);
            }
            if (CLEAR_FUNCTIONS.has(name)) {
                const arg = node.arguments[0];
                return arg === undefined || isNumberCompatible(arg);
            }
            // requestAnimationFrame is a DOM function either way.
            return true;
        }

        function isResultDiscarded(node: TSESTree.CallExpression): boolean {
            const parent = node.parent;
            return (
                (parent.type === TSESTree.AST_NODE_TYPES.ExpressionStatement && parent.expression === node) ||
                (parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "void")
            );
        }

        // Whether `arg` fits window.clearTimeout's `number | undefined`. Without
        // type information only a number literal or `undefined` is known to fit.
        function isNumberCompatible(arg: TSESTree.CallExpressionArgument): boolean {
            if (program && services?.esTreeNodeToTSNodeMap) {
                const checker = program.getTypeChecker();
                const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(arg));
                const parts = type.isUnion() ? type.types : [type];
                const fits =
                    ts.TypeFlags.NumberLike | ts.TypeFlags.Undefined | ts.TypeFlags.Any | ts.TypeFlags.Never;
                return parts.every((part) => (part.flags & fits) !== 0);
            }
            return (
                (arg.type === TSESTree.AST_NODE_TYPES.Literal && typeof arg.value === "number") ||
                (arg.type === TSESTree.AST_NODE_TYPES.Identifier && arg.name === "undefined")
            );
        }

        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                const variable = current.variables.find((v) => v.name === name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
