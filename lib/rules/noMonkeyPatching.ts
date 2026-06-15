import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

function isPrototypeAccess(node: TSESTree.Node): node is TSESTree.MemberExpression {
    if (node.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
        return false;
    }
    if (
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "prototype"
    ) {
        return true;
    }
    if (
        node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Literal &&
        node.property.value === "prototype"
    ) {
        return true;
    }
    return false;
}

function isPrototypeMemberAccess(node: TSESTree.MemberExpression): boolean {
    return isPrototypeAccess(node.object);
}

function getMemberName(node: TSESTree.MemberExpression): string {
    const parts: string[] = [];
    let current: TSESTree.Expression = node;
    while (current.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
        const prop = current.property;
        if (prop.type === TSESTree.AST_NODE_TYPES.Identifier) {
            parts.unshift(prop.name);
        } else if (prop.type === TSESTree.AST_NODE_TYPES.Literal) {
            parts.unshift(String(prop.value));
        } else {
            parts.unshift("[computed]");
        }
        current = current.object;
    }
    if (current.type === TSESTree.AST_NODE_TYPES.Identifier) {
        parts.unshift(current.name);
    }
    return parts.join(".");
}

const PROTO_METHODS = {
    defineProperty: "definePropertyOnPrototype",
    defineProperties: "definePropertyOnPrototype",
    assign: "assignToPrototype",
    set: "assignToPrototype",
} as const;

function isGetPrototypeOfCall(node: TSESTree.Expression): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.CallExpression &&
        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
        (node.callee.object.name === "Object" || node.callee.object.name === "Reflect") &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === "getPrototypeOf"
    );
}

export default ruleCreator({
    name: "no-monkey-patching",
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Discourage directly modifying prototypes.",
        },
        schema: [],
        messages: {
            directPrototypeAssignment:
                "Do not assign to `{{name}}`. Directly modifying prototypes is unsafe and discouraged.",
            definePropertyOnPrototype:
                "Do not use `Object.defineProperty` on `{{name}}`. Directly modifying prototypes is unsafe and discouraged.",
            assignToPrototype:
                "Do not use `Object.assign` on `{{name}}`. Directly modifying prototypes is unsafe and discouraged.",
            setPrototypeOf:
                "Do not use `Object.setPrototypeOf` on a prototype. Directly modifying prototypes is unsafe and discouraged.",
            deletePrototypeMember:
                "Do not delete `{{name}}`. Directly modifying prototypes is unsafe and discouraged.",
            getPrototypeOfAssignment:
                "Do not assign to a member of `Object.getPrototypeOf(...)`. Directly modifying prototypes is unsafe and discouraged.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    node.callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier
                ) {
                    return;
                }

                const objectName = node.callee.object.name;
                const methodName = node.callee.property.name;

                if (
                    (objectName === "Object" || objectName === "Reflect") &&
                    methodName === "setPrototypeOf" &&
                    node.arguments.length >= 1 &&
                    isPrototypeAccess(node.arguments[0])
                ) {
                    context.report({
                        node,
                        messageId: "setPrototypeOf",
                    });
                    return;
                }

                if (
                    (objectName === "Object" || objectName === "Reflect") &&
                    methodName in PROTO_METHODS &&
                    node.arguments.length >= 1 &&
                    isPrototypeAccess(node.arguments[0])
                ) {
                    const target = node.arguments[0] as TSESTree.MemberExpression;
                    context.report({
                        node,
                        messageId: PROTO_METHODS[methodName as keyof typeof PROTO_METHODS],
                        data: { name: getMemberName(target) },
                    });
                    return;
                }
            },

            AssignmentExpression(node: TSESTree.AssignmentExpression) {
                if (node.left.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                if (isGetPrototypeOfCall(node.left.object)) {
                    context.report({
                        node,
                        messageId: "getPrototypeOfAssignment",
                    });
                    return;
                }

                if (isPrototypeMemberAccess(node.left) || isPrototypeAccess(node.left)) {
                    context.report({
                        node,
                        messageId: "directPrototypeAssignment",
                        data: { name: getMemberName(node.left) },
                    });
                }
            },

            UnaryExpression(node: TSESTree.UnaryExpression) {
                if (
                    node.operator === "delete" &&
                    node.argument.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    isPrototypeMemberAccess(node.argument)
                ) {
                    context.report({
                        node,
                        messageId: "deletePrototypeMember",
                        data: { name: getMemberName(node.argument) },
                    });
                }
            },
        };
    },
});
