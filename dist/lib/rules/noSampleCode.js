import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
/**
 * Checks if a node is the sample `registerInterval` call.
 * `this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));`
 */
function isSampleIntervalCall(node) {
    // Check for `this.registerInterval(...)`
    if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerInterval") {
        return false;
    }
    // Check for `window.setInterval(...)` as the first argument
    const setIntervalCall = node.arguments[0];
    if (!setIntervalCall ||
        setIntervalCall.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        setIntervalCall.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        setIntervalCall.callee.object?.name !==
            "window" ||
        setIntervalCall.callee.property?.name !==
            "setInterval") {
        return false;
    }
    // Check for `() => console.log('setInterval')` as the first argument to setInterval
    const callback = setIntervalCall.arguments[0];
    if (!callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        callback.body.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        callback.body.callee?.property.type !==
            TSESTree.AST_NODE_TYPES.Identifier ||
        callback.body.callee
            ?.property?.name !== "log" ||
        callback.body.arguments[0]?.value !==
            "setInterval") {
        return false;
    }
    return true;
}
/**
 * Checks if a node is the sample `registerDomEvent` call.
 * `this.registerDomEvent(document, 'click', (evt: MouseEvent) => { console.log('click', evt); });`
 */
function isSampleDomEventCall(node) {
    // Check for `this.registerDomEvent(...)`
    if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerDomEvent") {
        return false;
    }
    // Check for `document` and `'click'` as the first two arguments
    if (node.arguments[0]?.name !== "document" ||
        node.arguments[1]?.value !== "click") {
        return false;
    }
    // Check for the specific callback function
    const callback = node.arguments[2];
    if (!callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        callback.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
        return false;
    }
    const firstStatement = callback.body.body[0];
    if (!firstStatement ||
        firstStatement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement ||
        firstStatement.expression.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        firstStatement.expression.callee
            ?.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        firstStatement.expression.callee
            ?.property?.name !== "log" ||
        firstStatement.expression.arguments[0]?.value !==
            "click") {
        return false;
    }
    return true;
}
export default ruleCreator({
    name: "no-sample-code",
    meta: {
        type: "problem",
        docs: {
            description: "Disallow sample code snippets from the Obsidian plugin template.",
        },
        schema: [],
        messages: {
            removeSampleInterval: "Remove the sample `registerInterval` call from the plugin template.",
            removeSampleDomEvent: "Remove the sample `registerDomEvent` call from the plugin template.",
        },
        fixable: "code",
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (isSampleIntervalCall(node)) {
                    context.report({
                        node,
                        messageId: "removeSampleInterval",
                        fix: (fixer) => fixer.remove(node.parent), // Remove the entire ExpressionStatement
                    });
                }
                else if (isSampleDomEventCall(node)) {
                    context.report({
                        node,
                        messageId: "removeSampleDomEvent",
                        fix: (fixer) => fixer.remove(node.parent), // Remove the entire ExpressionStatement
                    });
                }
            },
        };
    },
});
