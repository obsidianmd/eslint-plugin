import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { isBuiltin } from "node:module";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

export default ruleCreator({
    name: "no-nodejs-modules",
    meta: {
        type: "problem",
        docs: {
            description: "Disallow importing Node.js built-in modules unless guarded by Platform.isDesktop",
        },
        schema: [],
        messages: {
            noNodejs:
                "Do not import Node.js built-in module \"{{module}}\". Node.js APIs are not available on mobile. Use a dynamic import() guarded by Platform.isDesktop instead.",
            noNodejsRequire:
                "Do not use require() for Node.js built-in module \"{{module}}\". Use a dynamic import() guarded by Platform.isDesktop instead.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            // Static import declarations can never be guarded at runtime
            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                const source = node.source.value;
                if (isBuiltin(source)) {
                    context.report({
                        node,
                        messageId: "noNodejs",
                        data: { module: source },
                    });
                }
            },

            // Dynamic import() expressions — allowed when guarded by Platform.isDesktop
            ImportExpression(node: TSESTree.ImportExpression) {
                if (
                    node.source.type !== AST_NODE_TYPES.Literal ||
                    typeof node.source.value !== "string"
                ) {
                    return;
                }
                const source = node.source.value;
                if (!isBuiltin(source)) {
                    return;
                }
                if (isGuardedByPlatformIsDesktop(node)) {
                    return;
                }
                context.report({
                    node,
                    messageId: "noNodejs",
                    data: { module: source },
                });
            },

            // require() calls — always forbidden, use dynamic import() instead
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== AST_NODE_TYPES.Identifier ||
                    node.callee.name !== "require" ||
                    node.arguments.length === 0 ||
                    node.arguments[0].type !== AST_NODE_TYPES.Literal ||
                    typeof (node.arguments[0] as TSESTree.Literal).value !== "string"
                ) {
                    return;
                }
                const source = (node.arguments[0] as TSESTree.StringLiteral).value;
                if (!isBuiltin(source)) {
                    return;
                }
                context.report({
                    node,
                    messageId: "noNodejsRequire",
                    data: { module: source },
                });
            },
        };
    },
});

function isPlatformIsDesktop(expr: TSESTree.Expression): boolean {
    // Platform.isDesktop
    return (
        expr.type === AST_NODE_TYPES.MemberExpression &&
        expr.object.type === AST_NODE_TYPES.Identifier &&
        expr.object.name === "Platform" &&
        expr.property.type === AST_NODE_TYPES.Identifier &&
        expr.property.name === "isDesktop"
    );
}

function extractsPlatformIsDesktop(expr: TSESTree.Expression): boolean {
    if (isPlatformIsDesktop(expr)) {
        return true;
    }
    // Platform.isDesktop && ...
    if (
        expr.type === AST_NODE_TYPES.LogicalExpression &&
        expr.operator === "&&"
    ) {
        return extractsPlatformIsDesktop(expr.left);
    }
    return false;
}

function isGuardedByPlatformIsDesktop(node: TSESTree.Node): boolean {
    let current: TSESTree.Node | undefined = node.parent;
    let prevChild: TSESTree.Node = node;

    while (current) {
        if (current.type === AST_NODE_TYPES.IfStatement) {
            // Must be in the consequent (not the test or alternate)
            if (prevChild !== current.test && prevChild !== current.alternate) {
                if (extractsPlatformIsDesktop(current.test)) {
                    return true;
                }
            }
        } else if (current.type === AST_NODE_TYPES.ConditionalExpression) {
            if (prevChild !== current.test && prevChild !== current.alternate) {
                if (extractsPlatformIsDesktop(current.test)) {
                    return true;
                }
            }
        } else if (
            current.type === AST_NODE_TYPES.LogicalExpression &&
            current.operator === "&&" &&
            prevChild === current.right
        ) {
            if (extractsPlatformIsDesktop(current.left)) {
                return true;
            }
        }
        prevChild = current;
        current = current.parent;
    }
    return false;
}