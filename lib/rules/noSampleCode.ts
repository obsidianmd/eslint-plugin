import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

/**
 * Checks if a node is a `.log(label, ...)` call, as in `console.log('click', evt)`.
 * The callee can be anything (`tick()`, `this.update()`), so check it before reading it.
 */
function isLogCall(node: TSESTree.Node, label: string): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.CallExpression &&
        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === "log" &&
        (node.arguments[0] as TSESTree.Literal | undefined)?.value === label
    );
}

/**
 * Checks if a node is the sample `registerInterval` call.
 * `this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));`
 */
function isSampleIntervalCall(node: TSESTree.CallExpression): boolean {
    // Check for `this.registerInterval(...)`
    if (
        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerInterval"
    ) {
        return false;
    }

    // Check for `window.setInterval(...)` as the first argument
    const setIntervalCall = node.arguments[0];
    if (
        !setIntervalCall ||
        setIntervalCall.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        setIntervalCall.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        (setIntervalCall.callee.object as TSESTree.Identifier)?.name !==
        "window" ||
        (setIntervalCall.callee.property as TSESTree.Identifier)?.name !==
        "setInterval"
    ) {
        return false;
    }

    // Check for `() => console.log('setInterval')` as the first argument to setInterval
    const callback = setIntervalCall.arguments[0];
    if (
        !callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        !isLogCall(callback.body, "setInterval")
    ) {
        return false;
    }

    return true;
}

/**
 * Checks if a node is the sample `registerDomEvent` call.
 * `this.registerDomEvent(document, 'click', (evt: MouseEvent) => { console.log('click', evt); });`
 */
function isSampleDomEventCall(node: TSESTree.CallExpression): boolean {
    // Check for `this.registerDomEvent(...)`
    if (
        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerDomEvent"
    ) {
        return false;
    }

    // Check for `document` and `'click'` as the first two arguments
    if (
        (node.arguments[0] as TSESTree.Identifier)?.name !== "document" ||
        (node.arguments[1] as TSESTree.Literal)?.value !== "click"
    ) {
        return false;
    }

    // Check for the specific callback function
    const callback = node.arguments[2];
    if (
        !callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        callback.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement
    ) {
        return false;
    }

    const firstStatement = callback.body.body[0];
    if (
        !firstStatement ||
        firstStatement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement ||
        !isLogCall(firstStatement.expression, "click")
    ) {
        return false;
    }

    return true;
}

/**
 * The statement that can be deleted with the call: the call must be the whole
 * statement, as in the template, and the statement one of a list. Otherwise its
 * value is used (`const id = this.registerInterval(...)`, `return ...`, an arrow
 * body) or deleting it would make the next statement the body of an `if`/loop.
 */
function getRemovableStatement(node: TSESTree.CallExpression): TSESTree.ExpressionStatement | null {
    const statement = node.parent;
    if (statement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement || statement.expression !== node) {
        return null;
    }
    switch (statement.parent.type) {
        case TSESTree.AST_NODE_TYPES.Program:
        case TSESTree.AST_NODE_TYPES.BlockStatement:
        case TSESTree.AST_NODE_TYPES.StaticBlock:
        case TSESTree.AST_NODE_TYPES.SwitchCase:
        case TSESTree.AST_NODE_TYPES.TSModuleBlock:
            return statement;
        default:
            return null;
    }
}

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow sample code snippets from the Obsidian plugin template.",
            url: docsUrl("no-sample-code"),
        },
        schema: [],
        messages: {
            removeSampleInterval:
                "Remove the sample `registerInterval` call from the plugin template.",
            removeSampleDomEvent:
                "Remove the sample `registerDomEvent` call from the plugin template.",
        },
        fixable: "code" as const,
    },
    defaultOptions: [],
    create(context) {
        function report(node: TSESTree.CallExpression, messageId: "removeSampleInterval" | "removeSampleDomEvent"): void {
            const statement = getRemovableStatement(node);
            context.report({
                node,
                messageId,
                fix: statement ? (fixer) => fixer.remove(statement) : null,
            });
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (isSampleIntervalCall(node)) {
                    report(node, "removeSampleInterval");
                } else if (isSampleDomEventCall(node)) {
                    report(node, "removeSampleDomEvent");
                }
            },
        };
    },
});
