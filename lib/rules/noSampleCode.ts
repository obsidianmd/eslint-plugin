import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

/**
 * Whether evaluating `node` only reads values: no call, `new`, assignment,
 * `++`/`--`, `delete`, `await` or spread, so deleting it with the sample call
 * leaves out nothing the plugin does.
 */
function isSideEffectFree(node: TSESTree.Node): boolean {
    switch (node.type) {
        case TSESTree.AST_NODE_TYPES.Literal:
        case TSESTree.AST_NODE_TYPES.Identifier:
        case TSESTree.AST_NODE_TYPES.ThisExpression:
            return true;
        case TSESTree.AST_NODE_TYPES.TemplateLiteral:
            return node.expressions.every(isSideEffectFree);
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return isSideEffectFree(node.object) && (!node.computed || isSideEffectFree(node.property));
        case TSESTree.AST_NODE_TYPES.BinaryExpression:
        case TSESTree.AST_NODE_TYPES.LogicalExpression:
            return isSideEffectFree(node.left) && isSideEffectFree(node.right);
        case TSESTree.AST_NODE_TYPES.ConditionalExpression:
            return isSideEffectFree(node.test) && isSideEffectFree(node.consequent) && isSideEffectFree(node.alternate);
        case TSESTree.AST_NODE_TYPES.UnaryExpression:
            return node.operator !== "delete" && isSideEffectFree(node.argument);
        case TSESTree.AST_NODE_TYPES.ObjectExpression:
            // Listener options, such as `{ capture: true }`
            return node.properties.every(
                (property) =>
                    property.type === TSESTree.AST_NODE_TYPES.Property &&
                    property.kind === "init" &&
                    (!property.computed || isSideEffectFree(property.key)) &&
                    isSideEffectFree(property.value),
            );
        case TSESTree.AST_NODE_TYPES.TSAsExpression:
        case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
        case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
        case TSESTree.AST_NODE_TYPES.TSTypeAssertion:
            return isSideEffectFree(node.expression);
        default:
            return false;
    }
}

/**
 * Checks if a node is the sample's log call, `console.log(label, ...)` as in
 * `console.log('click', evt)`: after the label, it only reads values. A call
 * to another `log()`, such as the plugin's own logger, or one that computes what
 * it logs with a call, is the plugin's own code.
 */
function isSampleLog(node: TSESTree.Node, label: string): boolean {
    if (
        node.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.computed ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.object.name !== "console" ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "log"
    ) {
        return false;
    }
    const [first, ...rest] = node.arguments;
    return (
        first?.type === TSESTree.AST_NODE_TYPES.Literal &&
        first.value === label &&
        rest.every(isSideEffectFree)
    );
}

/**
 * Checks if a node is the sample `registerInterval` call, with any delay:
 * `this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));`
 * Returns the arguments that the sample does not fix (the delay and any after
 * it), or null when it is not the sample.
 */
function matchSampleIntervalCall(node: TSESTree.CallExpression): TSESTree.CallExpressionArgument[] | null {
    // Check for `this.registerInterval(...)`
    if (
        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerInterval"
    ) {
        return null;
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
        return null;
    }

    // Check for `() => console.log('setInterval')` as the first argument to setInterval.
    // A block body, as in `() => { console.log('setInterval'); this.sync(); }`, is
    // not the sample's.
    const callback = setIntervalCall.arguments[0];
    if (
        !callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        !isSampleLog(callback.body, "setInterval")
    ) {
        return null;
    }

    return [...setIntervalCall.arguments.slice(1), ...node.arguments.slice(1)];
}

/**
 * Checks if a node is the sample `registerDomEvent` call, whose handler does
 * nothing but the sample's log:
 * `this.registerDomEvent(document, 'click', (evt: MouseEvent) => { console.log('click', evt); });`
 * A handler with statements of its own is the plugin's click handler, not the
 * sample. Returns the arguments after the handler, or null when it is not the
 * sample.
 */
function matchSampleDomEventCall(node: TSESTree.CallExpression): TSESTree.CallExpressionArgument[] | null {
    // Check for `this.registerDomEvent(...)`
    if (
        node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        node.callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
        node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        node.callee.property.name !== "registerDomEvent"
    ) {
        return null;
    }

    // Check for `document` and `'click'` as the first two arguments
    if (
        (node.arguments[0] as TSESTree.Identifier)?.name !== "document" ||
        (node.arguments[1] as TSESTree.Literal)?.value !== "click"
    ) {
        return null;
    }

    // Check for the specific callback function: its body is the log alone
    const callback = node.arguments[2];
    if (
        !callback ||
        callback.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        callback.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement ||
        callback.body.body.length !== 1
    ) {
        return null;
    }

    const statement = callback.body.body[0];
    if (
        statement.type !== TSESTree.AST_NODE_TYPES.ExpressionStatement ||
        !isSampleLog(statement.expression, "click")
    ) {
        return null;
    }

    return node.arguments.slice(3);
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
        function report(
            node: TSESTree.CallExpression,
            messageId: "removeSampleInterval" | "removeSampleDomEvent",
            otherArguments: TSESTree.CallExpressionArgument[],
        ): void {
            // An argument the sample does not fix, such as the delay, is deleted
            // with the call, so it must not do anything: `this.getDelay()` would
            // no longer be called.
            const statement = otherArguments.every(isSideEffectFree) ? getRemovableStatement(node) : null;
            context.report({
                node,
                messageId,
                fix: statement ? (fixer) => fixer.remove(statement) : null,
            });
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                const intervalArguments = matchSampleIntervalCall(node);
                if (intervalArguments) {
                    report(node, "removeSampleInterval", intervalArguments);
                    return;
                }
                const domEventArguments = matchSampleDomEventCall(node);
                if (domEventArguments) {
                    report(node, "removeSampleDomEvent", domEventArguments);
                }
            },
        };
    },
});
