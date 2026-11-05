import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const EVENTS = new Set(["editor-drop", "editor-paste"]);

// Editor methods that change the document. A handler that calls one of them
// on its editor parameter inserts the content itself, so it must stop
// Obsidian's own insertion. `dispatch` is CodeMirror's, reached through
// `editor.cm`.
const EDITOR_WRITES = new Set([
    "replaceSelection",
    "replaceRange",
    "setValue",
    "setLine",
    "processLines",
    "transaction",
    "dispatch",
]);

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Require checking `evt.defaultPrevented` and calling `evt.preventDefault()` in editor-drop/editor-paste handlers.",
            url: docsUrl("editor-drop-paste"),
        },
        schema: [],
        messages: {
            missingDefaultPrevented:
                "Check 'evt.defaultPrevented' in the '{{eventName}}' handler and return early if another handler already handled the event.",
            missingPreventDefault:
                "Call 'evt.preventDefault()' in '{{eventName}}' handler after handling the event.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                const eventName = getWorkspaceOnEventName(node);
                if (!eventName || !EVENTS.has(eventName)) {
                    return;
                }

                const callback = node.arguments[1];
                if (!callback || !isFunction(callback)) {
                    return;
                }

                // An arrow function with an expression body is not checked.
                const body = callback.body;
                if (body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
                    return;
                }

                const evtParam = callback.params[0];
                if (!evtParam || evtParam.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                    return;
                }

                const { readsDefaultPrevented, callsPreventDefault, passesEvent } = findEventUses(
                    callback,
                    evtParam,
                    body,
                );

                // The event is handed to another function, which may check or
                // cancel it: that cannot be seen here.
                if (passesEvent) {
                    return;
                }

                // A handler that neither cancels the event nor writes to its
                // editor only observes the paste or drop and lets Obsidian
                // insert it. preventDefault() would cancel that insertion.
                const writesToEditor = handlerWritesToEditor(callback, body);
                if (!callsPreventDefault && !writesToEditor) {
                    return;
                }

                if (!readsDefaultPrevented) {
                    context.report({
                        node: callback,
                        messageId: "missingDefaultPrevented",
                        data: { eventName },
                    });
                }

                if (!callsPreventDefault) {
                    context.report({
                        node: callback,
                        messageId: "missingPreventDefault",
                        data: { eventName },
                    });
                }
            },
        };

        function getWorkspaceOnEventName(node: TSESTree.CallExpression): string | null {
            const callee = node.callee;
            if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return null;
            }

            if (
                callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                callee.property.name !== "on"
            ) {
                return null;
            }

            const firstArg = node.arguments[0];
            if (
                !firstArg ||
                firstArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                typeof firstArg.value !== "string"
            ) {
                return null;
            }

            return firstArg.value;
        }

        function isFunction(node: TSESTree.Node): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
            return (
                node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
                node.type === TSESTree.AST_NODE_TYPES.FunctionExpression
            );
        }

        // Whether the handler's body reads `<evt>.defaultPrevented` and calls
        // `<evt>.preventDefault()`, where <evt> is the handler's first
        // parameter. Its references come from scope analysis, so a variable of
        // the same name declared inside the handler does not count, and
        // neither do strings, comments or another object's property.
        function findEventUses(
            callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
            evtParam: TSESTree.Identifier,
            body: TSESTree.BlockStatement,
        ): { readsDefaultPrevented: boolean; callsPreventDefault: boolean; passesEvent: boolean } {
            let readsDefaultPrevented = false;
            let callsPreventDefault = false;
            let passesEvent = false;
            for (const identifier of bodyReferences(callback, evtParam, body)) {
                // `evt!`, `evt as ClipboardEvent` and `<ClipboardEvent>evt` are the event too.
                const target = skipTypeAssertions(identifier);
                const parent = target.parent;
                if (!parent) {
                    continue;
                }
                if (parent.type === TSESTree.AST_NODE_TYPES.MemberExpression && parent.object === target) {
                    const property = memberPropertyName(parent);
                    if (property === "defaultPrevented") {
                        readsDefaultPrevented = true;
                    } else if (
                        property === "preventDefault" &&
                        parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                        parent.parent.callee === parent
                    ) {
                        callsPreventDefault = true;
                    }
                } else if (destructuresDefaultPrevented(parent, target)) {
                    readsDefaultPrevented = true;
                } else if (
                    (parent.type === TSESTree.AST_NODE_TYPES.CallExpression ||
                        parent.type === TSESTree.AST_NODE_TYPES.NewExpression) &&
                    parent.arguments.includes(target as TSESTree.CallExpressionArgument)
                ) {
                    passesEvent = true;
                }
            }
            return { readsDefaultPrevented, callsPreventDefault, passesEvent };
        }

        // The references to a parameter inside the handler's body, from scope
        // analysis, so a variable of the same name declared inside the handler
        // does not count. A default value of a later parameter is not the body.
        function bodyReferences(
            callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
            param: TSESTree.Identifier,
            body: TSESTree.BlockStatement,
        ): TSESTree.Identifier[] {
            const variable = context.sourceCode
                .getDeclaredVariables(callback)
                .find((v) => v.identifiers.includes(param));
            return (variable?.references ?? [])
                .map((reference) => reference.identifier)
                .filter((identifier): identifier is TSESTree.Identifier =>
                    identifier.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    identifier.range[0] >= body.range[0] &&
                    identifier.range[1] <= body.range[1],
                );
        }

        // Whether the handler calls a method that changes the document on its
        // second parameter, the editor: `editor.replaceSelection(…)`,
        // `editor.transaction(…)` or `editor.cm.dispatch(…)`, also with
        // optional chaining or a type assertion.
        function handlerWritesToEditor(
            callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
            body: TSESTree.BlockStatement,
        ): boolean {
            const editorParam = callback.params[1];
            if (editorParam?.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            return bodyReferences(callback, editorParam, body).some((identifier) => {
                let current = skipTypeAssertions(identifier);
                while (
                    current.parent?.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    current.parent.object === current
                ) {
                    const member = current.parent;
                    const call = member.parent;
                    if (
                        call.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                        call.callee === member
                    ) {
                        return EDITOR_WRITES.has(memberPropertyName(member) ?? "");
                    }
                    current = skipTypeAssertions(member);
                }
                return false;
            });
        }

        function skipTypeAssertions(node: TSESTree.Node): TSESTree.Node {
            let current = node;
            while (
                current.parent &&
                (current.parent.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                    current.parent.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    current.parent.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                    current.parent.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion) &&
                current.parent.expression === current
            ) {
                current = current.parent;
            }
            return current;
        }

        // The name in `evt.name` and `evt["name"]`.
        function memberPropertyName(node: TSESTree.MemberExpression): string | null {
            if (!node.computed) {
                return node.property.type === TSESTree.AST_NODE_TYPES.Identifier ? node.property.name : null;
            }
            return node.property.type === TSESTree.AST_NODE_TYPES.Literal && typeof node.property.value === "string"
                ? node.property.value
                : null;
        }

        // `const { defaultPrevented } = evt` and `({ defaultPrevented } = evt)`.
        function destructuresDefaultPrevented(parent: TSESTree.Node, target: TSESTree.Node): boolean {
            let pattern: TSESTree.Node | null = null;
            if (parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator && parent.init === target) {
                pattern = parent.id;
            } else if (parent.type === TSESTree.AST_NODE_TYPES.AssignmentExpression && parent.right === target) {
                pattern = parent.left;
            }
            if (pattern?.type !== TSESTree.AST_NODE_TYPES.ObjectPattern) {
                return false;
            }
            return pattern.properties.some((property) => {
                if (property.type !== TSESTree.AST_NODE_TYPES.Property) {
                    return false;
                }
                const key = property.key;
                return key.type === TSESTree.AST_NODE_TYPES.Literal
                    ? key.value === "defaultPrevented"
                    : !property.computed && key.type === TSESTree.AST_NODE_TYPES.Identifier && key.name === "defaultPrevented";
            });
        }
    },
});
