import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
const EVENTS = new Set(["editor-drop", "editor-paste"]);
export default ruleCreator({
    name: "editor-drop-paste",
    meta: {
        type: "problem",
        docs: {
            description: "Require checking `evt.defaultPrevented` and calling `evt.preventDefault()` in editor-drop/editor-paste handlers.",
        },
        schema: [],
        messages: {
            missingDefaultPrevented: "Check 'evt.defaultPrevented' at the start of '{{eventName}}' handler and return early if already handled.",
            missingPreventDefault: "Call 'evt.preventDefault()' in '{{eventName}}' handler after handling the event.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                const eventName = getWorkspaceOnEventName(node);
                if (!eventName || !EVENTS.has(eventName)) {
                    return;
                }
                const callback = node.arguments[1];
                if (!callback || !isFunction(callback)) {
                    return;
                }
                const body = getFunctionBody(callback);
                if (!body) {
                    return;
                }
                const evtParam = callback.params[0];
                if (!evtParam || evtParam.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                    return;
                }
                const evtName = evtParam.name;
                if (!hasDefaultPreventedCheck(body, evtName)) {
                    context.report({
                        node: callback,
                        messageId: "missingDefaultPrevented",
                        data: { eventName },
                    });
                }
                if (!hasPreventDefaultCall(body, evtName)) {
                    context.report({
                        node: callback,
                        messageId: "missingPreventDefault",
                        data: { eventName },
                    });
                }
            },
        };
        function getWorkspaceOnEventName(node) {
            const callee = node.callee;
            if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return null;
            }
            if (callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                callee.property.name !== "on") {
                return null;
            }
            const firstArg = node.arguments[0];
            if (!firstArg ||
                firstArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                typeof firstArg.value !== "string") {
                return null;
            }
            return firstArg.value;
        }
        function isFunction(node) {
            return (node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
                node.type === TSESTree.AST_NODE_TYPES.FunctionExpression);
        }
        function getFunctionBody(node) {
            if (node.body.type === TSESTree.AST_NODE_TYPES.BlockStatement) {
                return node.body.body;
            }
            return null;
        }
        function hasDefaultPreventedCheck(statements, evtName) {
            const source = context.sourceCode;
            for (const stmt of statements) {
                const text = source.getText(stmt);
                if (text.includes(`${evtName}.defaultPrevented`)) {
                    return true;
                }
            }
            return false;
        }
        function hasPreventDefaultCall(statements, evtName) {
            const source = context.sourceCode;
            for (const stmt of statements) {
                const text = source.getText(stmt);
                if (text.includes(`${evtName}.preventDefault()`)) {
                    return true;
                }
            }
            return false;
        }
    },
});
