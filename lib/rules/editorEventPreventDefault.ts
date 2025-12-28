import { TSESTree, ESLintUtils, AST_NODE_TYPES } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const EDITOR_EVENTS = ["editor-drop", "editor-paste"];

function getEventParamName(
    handler: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
): string | null {
    const firstParam = handler.params[0];
    if (firstParam?.type === AST_NODE_TYPES.Identifier) {
        return firstParam.name;
    }
    return null;
}

function hasDefaultPreventedCheck(
    body: TSESTree.BlockStatement,
    eventParamName: string,
): boolean {
    // Look for early return pattern: if (evt.defaultPrevented) return;
    // or: if (evt.defaultPrevented) { return; }
    for (const statement of body.body) {
        if (statement.type !== AST_NODE_TYPES.IfStatement) {
            continue;
        }

        const test = statement.test;

        // Check for evt.defaultPrevented
        if (
            test.type === AST_NODE_TYPES.MemberExpression &&
            test.object.type === AST_NODE_TYPES.Identifier &&
            test.object.name === eventParamName &&
            test.property.type === AST_NODE_TYPES.Identifier &&
            test.property.name === "defaultPrevented"
        ) {
            // Check if consequence returns
            const consequent = statement.consequent;
            if (consequent.type === AST_NODE_TYPES.ReturnStatement) {
                return true;
            }
            if (
                consequent.type === AST_NODE_TYPES.BlockStatement &&
                consequent.body.some(
                    (s) => s.type === AST_NODE_TYPES.ReturnStatement,
                )
            ) {
                return true;
            }
        }
    }
    return false;
}

function hasPreventDefaultCall(
    body: TSESTree.BlockStatement,
    eventParamName: string,
): boolean {
    // Use a stack-based approach to avoid hitting circular parent references
    const stack: TSESTree.Node[] = [...body.body];

    while (stack.length > 0) {
        const node = stack.pop()!;

        if (
            node.type === AST_NODE_TYPES.CallExpression &&
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.object.type === AST_NODE_TYPES.Identifier &&
            node.callee.object.name === eventParamName &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            node.callee.property.name === "preventDefault"
        ) {
            return true;
        }

        // Add child nodes to stack, avoiding parent/range/loc properties that cause cycles
        const skipKeys = new Set(["parent", "range", "loc"]);
        for (const key of Object.keys(node)) {
            if (skipKeys.has(key)) continue;
            const child = (node as unknown as Record<string, unknown>)[key];
            if (child && typeof child === "object") {
                if (Array.isArray(child)) {
                    for (const item of child) {
                        if (item && typeof item === "object" && "type" in item) {
                            stack.push(item as TSESTree.Node);
                        }
                    }
                } else if ("type" in child) {
                    stack.push(child as TSESTree.Node);
                }
            }
        }
    }

    return false;
}

export default ruleCreator({
    name: "editor-event-prevent-default",
    meta: {
        docs: {
            description:
                "Require checking defaultPrevented and calling preventDefault() in editor-drop and editor-paste handlers.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "problem" as const,
        messages: {
            missingDefaultPreventedCheck:
                "editor-{{eventName}} handlers must check 'evt.defaultPrevented' and return early if true to avoid conflicts with other handlers.",
            missingPreventDefault:
                "editor-{{eventName}} handlers must call 'evt.preventDefault()' after handling to signal the event was processed.",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                // Look for workspace.on('editor-drop', ...) or workspace.on('editor-paste', ...)
                if (
                    node.callee.type !== AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "on"
                ) {
                    return;
                }

                // Check first argument is one of the editor events
                const firstArg = node.arguments[0];
                if (
                    !firstArg ||
                    firstArg.type !== AST_NODE_TYPES.Literal ||
                    typeof firstArg.value !== "string"
                ) {
                    return;
                }

                const eventName = firstArg.value;
                if (!EDITOR_EVENTS.includes(eventName)) {
                    return;
                }

                // Get the handler function (second argument)
                const handler = node.arguments[1];
                if (
                    !handler ||
                    (handler.type !== AST_NODE_TYPES.FunctionExpression &&
                        handler.type !== AST_NODE_TYPES.ArrowFunctionExpression)
                ) {
                    return;
                }

                // Get event parameter name
                const eventParamName = getEventParamName(handler);
                if (!eventParamName) {
                    return;
                }

                // Get function body
                let body: TSESTree.BlockStatement | null = null;
                if (handler.body.type === AST_NODE_TYPES.BlockStatement) {
                    body = handler.body;
                }

                if (!body) {
                    // Arrow function with expression body - can't check properly
                    return;
                }

                // Check for defaultPrevented check
                if (!hasDefaultPreventedCheck(body, eventParamName)) {
                    context.report({
                        node: handler,
                        messageId: "missingDefaultPreventedCheck",
                        data: { eventName },
                    });
                }

                // Check for preventDefault() call
                if (!hasPreventDefaultCall(body, eventParamName)) {
                    context.report({
                        node: handler,
                        messageId: "missingPreventDefault",
                        data: { eventName },
                    });
                }
            },
        };
    },
});
