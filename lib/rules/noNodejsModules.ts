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
    // !Platform.isDesktop ? ... (inverted check in alternate branch)
    if (
        expr.type === AST_NODE_TYPES.UnaryExpression &&
        expr.operator === "!" &&
        isPlatformIsDesktop(expr.argument)
    ) {
        return true;
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
            // Check for early return pattern: if (!Platform.isDesktop) { throw/return }
            if (prevChild !== current.test && isEarlyExitGuard(current)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.ConditionalExpression) {
            if (prevChild !== current.test && prevChild !== current.alternate) {
                if (extractsPlatformIsDesktop(current.test)) {
                    return true;
                }
            }
            // Check ternary: Platform.isDesktop ? import(...) : ...
            if (prevChild === current.consequent) {
                if (isPlatformIsDesktop(current.test)) {
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
        } else if (
            current.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.type === AST_NODE_TYPES.FunctionExpression ||
            current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
            // Check if function body starts with Platform.isDesktop guard that throws
            if (hasGuardAtFunctionStart(current)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.MethodDefinition) {
            // Check method definitions
            if (
                current.value.type === AST_NODE_TYPES.FunctionExpression &&
                hasGuardAtFunctionStart(current.value)
            ) {
                return true;
            }
        }
        prevChild = current;
        current = current.parent;
    }
    return false;
}

/**
 * Checks if an if-statement is an early exit guard pattern:
 * if (!Platform.isDesktop) { throw ... } or if (!Platform.isDesktop) { return ... }
 */
function isEarlyExitGuard(ifStmt: TSESTree.IfStatement): boolean {
    // Must not have an else clause (code after if is what we're protecting)
    if (ifStmt.alternate) {
        return false;
    }

    const test = ifStmt.test;

    // Check for: if (!Platform.isDesktop)
    if (
        test.type === AST_NODE_TYPES.UnaryExpression &&
        test.operator === "!" &&
        isPlatformIsDesktop(test.argument)
    ) {
        return hasEarlyExit(ifStmt.consequent);
    }

    return false;
}

/**
 * Checks if a statement or block contains an early exit (throw or return)
 */
function hasEarlyExit(stmt: TSESTree.Statement): boolean {
    if (stmt.type === AST_NODE_TYPES.ThrowStatement ||
        stmt.type === AST_NODE_TYPES.ReturnStatement) {
        return true;
    }

    if (stmt.type === AST_NODE_TYPES.BlockStatement) {
        // Check if first statement is throw or return
        const firstStmt = stmt.body[0];
        if (firstStmt && (
            firstStmt.type === AST_NODE_TYPES.ThrowStatement ||
            firstStmt.type === AST_NODE_TYPES.ReturnStatement
        )) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if function starts with guard: if (!Platform.isDesktop) { throw/return }
 */
function hasGuardAtFunctionStart(
    func: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
): boolean {
    const body = func.body;

    // Arrow functions might have expression bodies
    if (body.type !== AST_NODE_TYPES.BlockStatement) {
        return false;
    }

    const firstStatement = body.body[0];
    if (!firstStatement || firstStatement.type !== AST_NODE_TYPES.IfStatement) {
        return false;
    }

    return isEarlyExitGuard(firstStatement);
}
