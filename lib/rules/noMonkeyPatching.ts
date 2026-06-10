import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// Matches: Foo.prototype.bar, Foo.prototype
function isPrototypeAccess(node: TSESTree.MemberExpression): boolean {
    if (
        node.object.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.object.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.object.property.name === "prototype"
    ) {
        return true;
    }

    if (
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "prototype"
    ) {
        return true;
    }

    return false;
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

function isPrototypeMemberExpression(node: TSESTree.Node): boolean {
    if (node.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
        return false;
    }
    return (
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "prototype"
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
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "Object" &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.property.name === "defineProperty" &&
                    node.arguments.length >= 2 &&
                    isPrototypeMemberExpression(node.arguments[0])
                ) {
                    const target = node.arguments[0] as TSESTree.MemberExpression;
                    context.report({
                        node,
                        messageId: "definePropertyOnPrototype",
                        data: { name: getMemberName(target) },
                    });
                    return;
                }

                if (
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "Object" &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.property.name === "defineProperties" &&
                    node.arguments.length >= 1 &&
                    isPrototypeMemberExpression(node.arguments[0])
                ) {
                    const target = node.arguments[0] as TSESTree.MemberExpression;
                    context.report({
                        node,
                        messageId: "definePropertyOnPrototype",
                        data: { name: getMemberName(target) },
                    });
                    return;
                }

                if (
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "Object" &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.property.name === "assign" &&
                    node.arguments.length >= 1 &&
                    isPrototypeMemberExpression(node.arguments[0])
                ) {
                    const target = node.arguments[0] as TSESTree.MemberExpression;
                    context.report({
                        node,
                        messageId: "assignToPrototype",
                        data: { name: getMemberName(target) },
                    });
                    return;
                }
            },

            AssignmentExpression(node: TSESTree.AssignmentExpression) {
                if (node.left.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                if (isPrototypeAccess(node.left)) {
                    context.report({
                        node,
                        messageId: "directPrototypeAssignment",
                        data: { name: getMemberName(node.left) },
                    });
                }
            },
        };
    },
});
