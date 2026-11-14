import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { isBuiltin } from "node:module";
import { hasLocalBinding } from "../globalWindow.js";
import { isManifestDesktopOnly } from "../manifest.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

interface NoNodejsModulesOptions {
    isDesktopOnly?: boolean;
}

export default ruleCreator<[NoNodejsModulesOptions?], "noNodejs">({
    meta: {
        type: "problem",
        docs: {
            description: "Disallow importing Node.js built-in modules unless guarded by Platform.isDesktop",
            url: docsUrl("no-nodejs-modules"),
        },
        schema: [
            {
                type: "object",
                properties: {
                    isDesktopOnly: {
                        type: "boolean",
                        description:
                            "Whether the code being linted only ever runs on desktop, which makes Node.js APIs available. Defaults to the isDesktopOnly value of a manifest.json in the working directory, so a repo with no manifest -- a library, tooling, a standalone CLI -- can say so without shipping a fake one.",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            noNodejs:
                "Do not import Node.js built-in module \"{{module}}\". Node.js APIs are not available on mobile. Use a dynamic import() or require() guarded by Platform.isDesktop instead.",
        },
    },
    // Must be [{}] rather than []: applyDefault iterates the defaults array, so
    // an empty one discards the user's options instead of merging them.
    defaultOptions: [{}],
    create(context, [options]) {
        // The rule is listed in eslint-comments/no-restricted-disable, so a
        // disable comment is not an available escape; this option is.
        const isDesktopOnly =
            options?.isDesktopOnly ?? isManifestDesktopOnly();
        if (isDesktopOnly) {
            return {};
        }
        // A declaration file only describes modules: an import in it, also in
        // a `declare module`, never runs.
        if (/\.d\.([^./\\]+\.)?[cm]?ts$/i.test(context.filename)) {
            return {};
        }

        // TypeScript erases `import type` and `export type`. An import or
        // export whose specifiers are all inline `type` ones is erased too,
        // except with verbatimModuleSyntax, which keeps it as
        // `import {} from "fs"`, and that still loads the module.
        const keepsInlineTypeOnly =
            context.sourceCode.parserServices?.program?.getCompilerOptions()
                .verbatimModuleSyntax === true;
        const allInlineTypeOnly = (specifiers: readonly (TSESTree.ImportClause | TSESTree.ExportSpecifier)[]) =>
            !keepsInlineTypeOnly &&
            specifiers.length > 0 &&
            specifiers.every((specifier) =>
                specifier.type === AST_NODE_TYPES.ImportSpecifier
                    ? specifier.importKind === "type"
                    : specifier.type === AST_NODE_TYPES.ExportSpecifier && specifier.exportKind === "type",
            );

        // A static import or re-export loads the module wherever the file
        // runs, so it can never be guarded.
        const reportStatic = (node: TSESTree.Node, source: string) => {
            if (isBuiltin(source)) {
                context.report({
                    node,
                    messageId: "noNodejs",
                    data: { module: source },
                });
            }
        };

        return {
            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                if (node.importKind === "type" || allInlineTypeOnly(node.specifiers)) {
                    return;
                }
                reportStatic(node, node.source.value);
            },

            ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
                if (!node.source || node.exportKind === "type" || allInlineTypeOnly(node.specifiers)) {
                    return;
                }
                reportStatic(node, node.source.value);
            },

            ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
                if (node.exportKind === "type") {
                    return;
                }
                reportStatic(node, node.source.value);
            },

            // import fs = require("fs");
            TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
                const reference = node.moduleReference;
                if (
                    node.importKind === "type" ||
                    reference.type !== AST_NODE_TYPES.TSExternalModuleReference ||
                    typeof reference.expression.value !== "string"
                ) {
                    return;
                }
                reportStatic(node, reference.expression.value);
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

            // require() calls, also through the global object
            // (`window.require()`) — allowed when guarded by Platform.isDesktop
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    !isRequireCallee(node.callee) ||
                    node.arguments.length === 0 ||
                    node.arguments[0].type !== AST_NODE_TYPES.Literal ||
                    typeof node.arguments[0].value !== "string"
                ) {
                    return;
                }
                const source = node.arguments[0].value;
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
        };

        // `require`, or `require` read from the global object: on desktop,
        // Electron's renderer puts Node's require() on `window`, so
        // `window.require("fs")` and `(window as any).require("fs")` load the
        // module just as a bare `require("fs")` does, and fail on mobile. Only
        // the global object counts, and only where no local binding of that
        // name shadows it: `x.require()` on anything else, such as Electron's
        // `remote.require()` or a module loader of a library, is not Node's
        // require() of this window.
        function isRequireCallee(callee: TSESTree.Expression): boolean {
            if (callee.type === AST_NODE_TYPES.Identifier) {
                return callee.name === "require";
            }
            if (callee.type !== AST_NODE_TYPES.MemberExpression || getPropertyName(callee) !== "require") {
                return false;
            }
            const object = skipTypeWrappers(callee.object);
            return (
                object.type === AST_NODE_TYPES.Identifier &&
                GLOBAL_OBJECT_NAMES.has(object.name) &&
                !hasLocalBinding(context.sourceCode.getScope(object), object.name)
            );
        }
    },
});

// The names of the global object in Obsidian's desktop renderer, where they are
// all the same window: activeWindow is the focused one, a popout's own.
const GLOBAL_OBJECT_NAMES = new Set(["window", "globalThis", "self", "global", "activeWindow"]);

// `x.name`, `x["name"]` or `` x[`name`] ``. A computed key such as `x[key]` names
// none that can be read.
function getPropertyName(node: TSESTree.MemberExpression): string | undefined {
    const property = node.property;
    if (!node.computed) {
        return property.type === AST_NODE_TYPES.Identifier ? property.name : undefined;
    }
    if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
        return property.value;
    }
    if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
        return property.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
}

// `(window as any)`, `(<any>window)`, `window!`, `window satisfies …`
function skipTypeWrappers(node: TSESTree.Expression): TSESTree.Expression {
    let current = node;
    while (
        current.type === AST_NODE_TYPES.TSAsExpression ||
        current.type === AST_NODE_TYPES.TSTypeAssertion ||
        current.type === AST_NODE_TYPES.TSNonNullExpression ||
        current.type === AST_NODE_TYPES.TSSatisfiesExpression
    ) {
        current = current.expression;
    }
    return current;
}

// The Platform flags that say whether Obsidian runs as the desktop app, where
// Node.js is available: Platform.isDesktopApp says exactly that, and
// Platform.isDesktop, the desktop layout, is only ever true in it. On a phone or
// tablet, Platform.isMobileApp and Platform.isMobile are always true.
const DESKTOP_FLAGS = new Set(["isDesktop", "isDesktopApp"]);
const MOBILE_FLAGS = new Set(["isMobile", "isMobileApp"]);

// Platform.isDesktop, or Platform["isDesktop"], for one of `flags`.
function isPlatformFlag(expr: TSESTree.Expression, flags: ReadonlySet<string>): boolean {
    if (
        expr.type !== AST_NODE_TYPES.MemberExpression ||
        expr.object.type !== AST_NODE_TYPES.Identifier ||
        expr.object.name !== "Platform"
    ) {
        return false;
    }
    const name = getPropertyName(expr);
    return name !== undefined && flags.has(name);
}

// Where `expr` is true, the code runs in the desktop app: Platform.isDesktop,
// Platform.isDesktopApp, !Platform.isMobile, !Platform.isMobileApp, and `&&`
// or `||` of such checks, with `&&` needing only one of them.
function desktopWhenTrue(expr: TSESTree.Expression): boolean {
    if (isPlatformFlag(expr, DESKTOP_FLAGS)) {
        return true;
    }
    if (expr.type === AST_NODE_TYPES.UnaryExpression && expr.operator === "!") {
        return desktopWhenFalse(expr.argument);
    }
    if (expr.type === AST_NODE_TYPES.LogicalExpression) {
        if (expr.operator === "&&") {
            return desktopWhenTrue(expr.left) || desktopWhenTrue(expr.right);
        }
        if (expr.operator === "||") {
            return desktopWhenTrue(expr.left) && desktopWhenTrue(expr.right);
        }
    }
    return false;
}

// Where `expr` is false, the code runs in the desktop app: Platform.isMobile,
// Platform.isMobileApp, !Platform.isDesktop, !Platform.isDesktopApp, and `||`
// or `&&` of such checks, with `||` needing only one of them.
function desktopWhenFalse(expr: TSESTree.Expression): boolean {
    if (isPlatformFlag(expr, MOBILE_FLAGS)) {
        return true;
    }
    if (expr.type === AST_NODE_TYPES.UnaryExpression && expr.operator === "!") {
        return desktopWhenTrue(expr.argument);
    }
    if (expr.type === AST_NODE_TYPES.LogicalExpression) {
        if (expr.operator === "||") {
            return desktopWhenFalse(expr.left) || desktopWhenFalse(expr.right);
        }
        if (expr.operator === "&&") {
            return desktopWhenFalse(expr.left) && desktopWhenFalse(expr.right);
        }
    }
    return false;
}

function isGuardedByPlatformIsDesktop(node: TSESTree.CallExpression | TSESTree.ImportExpression): boolean {
    // `window.require?.("fs")` calls require() only where the global object
    // has it, as only the desktop app does. A bare `require?.("fs")` is no
    // guard: the bundle's own `require` exists on mobile too, and throws there
    // for a Node.js module.
    if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.optional &&
        node.callee.type !== AST_NODE_TYPES.Identifier
    ) {
        return true;
    }
    let current: TSESTree.Node | undefined = node.parent;
    let prevChild: TSESTree.Node = node;
    // A try block catches what is thrown while it runs, so not from a function
    // defined in it and called later.
    let inSameFunction = true;

    while (current) {
        if (current.type === AST_NODE_TYPES.IfStatement) {
            if (prevChild === current.consequent && desktopWhenTrue(current.test)) {
                return true;
            }
            // if (!Platform.isDesktop) { ... } else { require(...) }
            if (prevChild === current.alternate && desktopWhenFalse(current.test)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.ConditionalExpression) {
            // Platform.isDesktop ? import(...) : ...
            if (prevChild === current.consequent && desktopWhenTrue(current.test)) {
                return true;
            }
            // !Platform.isDesktop ? ... : import(...)
            if (prevChild === current.alternate && desktopWhenFalse(current.test)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.LogicalExpression && prevChild === current.right) {
            // Platform.isDesktop && require(...)
            if (current.operator === "&&" && desktopWhenTrue(current.left)) {
                return true;
            }
            // !Platform.isDesktop || require(...)
            if (current.operator === "||" && desktopWhenFalse(current.left)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.BlockStatement || current.type === AST_NODE_TYPES.SwitchCase) {
            // if (!Platform.isDesktop) return; anywhere before the statement.
            // That covers a block only: default parameter values, also inside a
            // destructuring pattern, are evaluated before the body runs. A
            // function declaration is hoisted, so the statements before the
            // early exit can call it: it is guarded only by an early exit that
            // is the block's first statement. The statements of a switch case
            // are a block of their own here: a case falls through into the next
            // one only after its own statements, early exit included, ran, and
            // one entered directly skips them. A case's own test runs before
            // its statements.
            const body = current.type === AST_NODE_TYPES.SwitchCase ? current.consequent : current.body;
            const index = body.indexOf(prevChild as TSESTree.Statement);
            const before =
                prevChild.type === AST_NODE_TYPES.FunctionDeclaration
                    ? body.slice(0, Math.min(index, 1))
                    : body.slice(0, index);
            if (index >= 0 && before.some(isEarlyExitGuard)) {
                return true;
            }
        } else if (current.type === AST_NODE_TYPES.TryStatement) {
            // try { require("fs") } catch { ... }: on mobile the catch runs. An
            // import() rejects instead of throwing, which the catch sees only
            // when it is awaited there. A catch that always throws, as in
            // `catch (e) { throw e; }`, hands the failure on, and is no guard.
            if (
                inSameFunction &&
                prevChild === current.block &&
                current.handler !== null &&
                !alwaysThrows(current.handler.body) &&
                (node.type === AST_NODE_TYPES.CallExpression || isAwaited(node))
            ) {
                return true;
            }
        } else if (
            current.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.type === AST_NODE_TYPES.FunctionExpression ||
            current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
            inSameFunction = false;
        }
        prevChild = current;
        current = current.parent;
    }
    return false;
}

// `await import("fs")`, also through a type assertion.
function isAwaited(node: TSESTree.Node): boolean {
    let child = node;
    let parent = node.parent;
    while (
        parent &&
        (parent.type === AST_NODE_TYPES.TSAsExpression ||
            parent.type === AST_NODE_TYPES.TSTypeAssertion ||
            parent.type === AST_NODE_TYPES.TSNonNullExpression ||
            parent.type === AST_NODE_TYPES.TSSatisfiesExpression)
    ) {
        child = parent;
        parent = parent.parent;
    }
    return parent?.type === AST_NODE_TYPES.AwaitExpression && parent.argument === child;
}

/**
 * An early exit: `if (!Platform.isDesktop) { throw ... }` or `return`, also
 * with Platform.isMobile or `Platform.isMobile || ...`, without an else.
 */
function isEarlyExitGuard(statement: TSESTree.Statement): boolean {
    return (
        statement.type === AST_NODE_TYPES.IfStatement &&
        !statement.alternate &&
        desktopWhenFalse(statement.test) &&
        alwaysExits(statement.consequent)
    );
}

/**
 * A block that reaches a `throw` among its own statements, with no statement
 * before it that could leave the block otherwise: a `return`, `break` or
 * `continue`, also inside an `if` or another nested statement.
 */
function alwaysThrows(block: TSESTree.BlockStatement): boolean {
    for (const statement of block.body) {
        if (statement.type === AST_NODE_TYPES.ThrowStatement) {
            return true;
        }
        if (mayLeave(statement)) {
            return false;
        }
    }
    return false;
}

// Whether `node` holds a `return`, `break` or `continue`, outside nested functions.
function mayLeave(node: TSESTree.Node): boolean {
    if (
        node.type === AST_NODE_TYPES.ReturnStatement ||
        node.type === AST_NODE_TYPES.BreakStatement ||
        node.type === AST_NODE_TYPES.ContinueStatement
    ) {
        return true;
    }
    if (
        node.type === AST_NODE_TYPES.FunctionDeclaration ||
        node.type === AST_NODE_TYPES.FunctionExpression ||
        node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        node.type === AST_NODE_TYPES.ClassDeclaration ||
        node.type === AST_NODE_TYPES.ClassExpression
    ) {
        return false;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === "parent") {
            continue;
        }
        for (const child of Array.isArray(value) ? value : [value]) {
            if (child !== null && typeof child === "object" && typeof (child as TSESTree.Node).type === "string" && mayLeave(child as TSESTree.Node)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * A `throw` or `return`, or a block that reaches one among its own statements
 * before any `break` or `continue`.
 */
function alwaysExits(stmt: TSESTree.Statement): boolean {
    if (stmt.type === AST_NODE_TYPES.ThrowStatement || stmt.type === AST_NODE_TYPES.ReturnStatement) {
        return true;
    }
    if (stmt.type !== AST_NODE_TYPES.BlockStatement) {
        return false;
    }
    for (const statement of stmt.body) {
        if (statement.type === AST_NODE_TYPES.ThrowStatement || statement.type === AST_NODE_TYPES.ReturnStatement) {
            return true;
        }
        if (statement.type === AST_NODE_TYPES.BreakStatement || statement.type === AST_NODE_TYPES.ContinueStatement) {
            return false;
        }
    }
    return false;
}
