import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

// Shared by no-global-this and prefer-window-timers, whose fixes write
// `window.…` in place of `globalThis.…`, `global.…` or a bare timer call.

type Context = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;
type Scope = ReturnType<Context["sourceCode"]["getScope"]>;

export interface TypeInfo {
    checker: ts.TypeChecker;
    toTs(node: TSESTree.Node): ts.Node;
}

/** The type checker, when the file is linted with type information. */
export function getTypeInfo(context: Context): TypeInfo | null {
    const services = context.sourceCode.parserServices;
    const program = services?.program;
    const map = services?.esTreeNodeToTSNodeMap;
    if (!program || !map) {
        return null;
    }
    return { checker: program.getTypeChecker(), toTs: (node) => map.get(node) };
}

/**
 * Whether `window` written at `node` would be the global window:
 *
 * - no local binding named `window` shadows it, such as a parameter or a
 *   Playwright `const window = await app.firstWindow()`;
 * - with type information, the program declares it, so the project has the
 *   DOM lib;
 * - no earlier `typeof window` (or `typeof document`) check says the code
 *   also runs where there is no window, unless it proves the window is there
 *   at `node`.
 *
 * Writing `window` anywhere else is wrong, so a rule offers neither a fix
 * nor a suggestion there.
 */
export function isGlobalWindowAt(context: Context, node: TSESTree.Node): boolean {
    if (hasLocalBinding(context.sourceCode.getScope(node), "window")) {
        return false;
    }
    const types = getTypeInfo(context);
    if (types && !getGlobalWindowSymbol(types, node)) {
        return false;
    }
    return !followsWindowCheck(context.sourceCode, node);
}

/** The declared type of the global `window`, with type information. */
export function getGlobalWindowType(types: TypeInfo, node: TSESTree.Node): ts.Type | null {
    const symbol = getGlobalWindowSymbol(types, node);
    return symbol ? types.checker.getTypeOfSymbol(symbol) : null;
}

function getGlobalWindowSymbol(types: TypeInfo, node: TSESTree.Node): ts.Symbol | undefined {
    return types.checker.resolveName("window", types.toTs(node), ts.SymbolFlags.Value, false);
}

/** Whether a declaration in the file binds `name` where `scope` can see it. */
export function hasLocalBinding(scope: Scope, name: string): boolean {
    let current: Scope | null = scope;
    while (current) {
        const variable = current.set.get(name);
        // Globals from the environment or the TypeScript lib have no
        // definitions in the file.
        if (variable && variable.defs.length > 0 && isValueVariable(variable)) {
            return true;
        }
        current = current.upper;
    }
    return false;
}

function isValueVariable(variable: object): boolean {
    // typescript-eslint tells value and type bindings apart; eslint-scope
    // only has values.
    return !("isValueVariable" in variable) || variable.isValueVariable !== false;
}

/** Whether the value of `node` is thrown away, so its type cannot matter. */
export function isResultDiscarded(node: TSESTree.Expression): boolean {
    const parent = node.parent;
    return (
        (parent.type === TSESTree.AST_NODE_TYPES.ExpressionStatement && parent.expression === node) ||
        (parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "void")
    );
}

// Spares the AST walk in a file without a window check.
const WINDOW_CHECK_TEXT = /\btypeof[\s(]+(?:[\w$]+\s*\??\.\s*)*(?:window|document)\b|["'`](?:window|document)["'`]\s+in\b/;
const ENVIRONMENT_GLOBALS = new Set(["window", "document"]);
const windowChecksCache = new WeakMap<TSESTree.Program, TSESTree.Node[]>();

// A check before `node` says the code also runs where there is no window, as
// in `typeof window === "undefined" ? globalThis.setTimeout(…) : window.setTimeout(…)`,
// where `window` would not exist (and TypeScript narrows it to `never`).
// Where the check's `if`, `?:`, `&&` or `||` decides whether `node` runs, it
// lets `node` through only if it proves the window is there:
// `if (typeof document === "undefined") return;` before it, or the branch of
// `typeof window !== "undefined" ? … : …` that it is in. A check that does not
// decide it, such as `const browser = typeof window !== "undefined"`, still
// counts in the same function, but not in the functions nested in it.
function followsWindowCheck(sourceCode: Context["sourceCode"], node: TSESTree.Node): boolean {
    return getWindowChecks(sourceCode).some((check) => {
        const scope = enclosingFunction(check);
        if (check.range[1] > node.range[0] || !contains(scope, node)) {
            return false;
        }
        const present = windowPresenceAt(check, node);
        return present === undefined ? enclosingFunction(node) === scope : !present;
    });
}

// Whether the window is there at `node`, as far as `check` decides it.
function windowPresenceAt(check: TSESTree.Node, node: TSESTree.Node): boolean | undefined {
    let condition: TSESTree.Node = check;
    // Whether the window is there when `condition` is true.
    let presentWhenTrue: boolean;
    if (check.type === TSESTree.AST_NODE_TYPES.BinaryExpression) {
        // "window" in globalThis
        presentWhenTrue = true;
    } else {
        // typeof window === "undefined", typeof document !== "object"
        const comparison = check.parent;
        if (
            comparison?.type !== TSESTree.AST_NODE_TYPES.BinaryExpression ||
            !["===", "!==", "==", "!="].includes(comparison.operator)
        ) {
            return undefined;
        }
        const other = comparison.left === check ? comparison.right : comparison.left;
        if (other.type !== TSESTree.AST_NODE_TYPES.Literal || typeof other.value !== "string") {
            return undefined;
        }
        const equal = comparison.operator === "===" || comparison.operator === "==";
        presentWhenTrue = equal === (other.value !== "undefined");
        condition = comparison;
    }
    const value = conditionValueAt(condition, node);
    return value === undefined ? undefined : value === presentWhenTrue;
}

// What `condition` is known to have evaluated to where `node` runs, from the
// `if`, `?:`, `&&`, `||` or `!` around it, or an `if` before `node` that
// returns or throws.
function conditionValueAt(condition: TSESTree.Node, node: TSESTree.Node): boolean | undefined {
    const parent = condition.parent;
    if (!parent) {
        return undefined;
    }
    switch (parent.type) {
        case TSESTree.AST_NODE_TYPES.UnaryExpression: {
            if (parent.operator !== "!") {
                return undefined;
            }
            const value = conditionValueAt(parent, node);
            return value === undefined ? undefined : !value;
        }
        case TSESTree.AST_NODE_TYPES.LogicalExpression: {
            if (parent.left === condition && contains(parent.right, node)) {
                return parent.operator === "&&" ? true : parent.operator === "||" ? false : undefined;
            }
            // Part of a larger condition: `a && b` true means both are.
            const value = conditionValueAt(parent, node);
            if (parent.operator === "&&") {
                return value === true ? true : undefined;
            }
            if (parent.operator === "||") {
                return value === false ? false : undefined;
            }
            return undefined;
        }
        case TSESTree.AST_NODE_TYPES.ConditionalExpression:
            if (parent.test !== condition) {
                return undefined;
            }
            return contains(parent.consequent, node) ? true : contains(parent.alternate, node) ? false : undefined;
        case TSESTree.AST_NODE_TYPES.IfStatement:
            if (parent.test !== condition) {
                return undefined;
            }
            if (contains(parent.consequent, node)) {
                return true;
            }
            if (parent.alternate && contains(parent.alternate, node)) {
                return false;
            }
            // if (typeof window === "undefined") return; … node
            return node.range[0] >= parent.range[1] && contains(parent.parent, node) && exits(parent.consequent)
                ? false
                : undefined;
        default:
            return undefined;
    }
}

function exits(statement: TSESTree.Statement): boolean {
    switch (statement.type) {
        case TSESTree.AST_NODE_TYPES.ReturnStatement:
        case TSESTree.AST_NODE_TYPES.ThrowStatement:
        case TSESTree.AST_NODE_TYPES.BreakStatement:
        case TSESTree.AST_NODE_TYPES.ContinueStatement:
            return true;
        case TSESTree.AST_NODE_TYPES.BlockStatement: {
            const last = statement.body.at(-1);
            return last !== undefined && exits(last);
        }
        default:
            return false;
    }
}

// `typeof window`, `typeof globalThis.document`, `"window" in globalThis`.
function getWindowChecks(sourceCode: Context["sourceCode"]): TSESTree.Node[] {
    const cached = windowChecksCache.get(sourceCode.ast);
    if (cached) {
        return cached;
    }
    const checks: TSESTree.Node[] = [];
    if (WINDOW_CHECK_TEXT.test(sourceCode.text)) {
        const visit = (node: TSESTree.Node): void => {
            if (isWindowCheck(node)) {
                checks.push(node);
            }
            for (const key of sourceCode.visitorKeys[node.type] ?? []) {
                const child: unknown = (node as unknown as Record<string, unknown>)[key];
                for (const item of Array.isArray(child) ? child : [child]) {
                    if (isNode(item)) {
                        visit(item);
                    }
                }
            }
        };
        visit(sourceCode.ast);
    }
    windowChecksCache.set(sourceCode.ast, checks);
    return checks;
}

function isNode(value: unknown): value is TSESTree.Node {
    return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

/**
 * Whether `node` checks for a window: `typeof window`, `typeof document`,
 * `typeof globalThis.window`, `"window" in globalThis`. Rewriting the
 * `globalThis` in such a check to `window` would throw where it is false.
 */
export function isWindowCheck(node: TSESTree.Node): boolean {
    if (node.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.operator === "typeof") {
        const arg =
            node.argument.type === TSESTree.AST_NODE_TYPES.ChainExpression ? node.argument.expression : node.argument;
        if (arg.type === TSESTree.AST_NODE_TYPES.Identifier) {
            return ENVIRONMENT_GLOBALS.has(arg.name);
        }
        return (
            arg.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
            !arg.computed &&
            arg.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
            ENVIRONMENT_GLOBALS.has(arg.property.name)
        );
    }
    return (
        node.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
        node.operator === "in" &&
        node.left.type === TSESTree.AST_NODE_TYPES.Literal &&
        typeof node.left.value === "string" &&
        ENVIRONMENT_GLOBALS.has(node.left.value)
    );
}

function enclosingFunction(node: TSESTree.Node): TSESTree.Node {
    let current: TSESTree.Node | undefined = node.parent;
    while (current) {
        if (
            current.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration ||
            current.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
            current.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
            current.type === TSESTree.AST_NODE_TYPES.Program
        ) {
            return current;
        }
        current = current.parent;
    }
    return node;
}

function contains(outer: TSESTree.Node, inner: TSESTree.Node): boolean {
    return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
}

const SET_TIMERS = new Set(["setInterval", "setTimeout"]);
const CLEAR_TIMERS = new Set(["clearInterval", "clearTimeout"]);

/**
 * Whether `window.<name>(...)` keeps every type a call to Node's or the DOM's
 * global timer function had. With @types/node, setTimeout() returns a
 * NodeJS.Timeout and clearTimeout() accepts one, while window's return and
 * accept a number.
 */
export function isTimerCallTypeSafe(node: TSESTree.CallExpression, name: string, types: TypeInfo | null): boolean {
    if (SET_TIMERS.has(name)) {
        // The NodeJS.Timeout it returned becomes a number, which only
        // matters when the value is used.
        return isResultDiscarded(node);
    }
    if (CLEAR_TIMERS.has(name)) {
        const arg = node.arguments[0];
        return arg === undefined || isNumberCompatible(arg, types);
    }
    // requestAnimationFrame and cancelAnimationFrame are DOM functions either way.
    return name === "requestAnimationFrame" || name === "cancelAnimationFrame";
}

// Whether `arg` fits window.clearTimeout's `number | undefined`. Without
// type information only a number literal or `undefined` is known to fit.
function isNumberCompatible(arg: TSESTree.CallExpressionArgument, types: TypeInfo | null): boolean {
    if (types) {
        const type = types.checker.getTypeAtLocation(types.toTs(arg));
        const parts = type.isUnion() ? type.types : [type];
        const fits = ts.TypeFlags.NumberLike | ts.TypeFlags.Undefined | ts.TypeFlags.Any | ts.TypeFlags.Never;
        return parts.every((part) => (part.flags & fits) !== 0);
    }
    return (
        (arg.type === TSESTree.AST_NODE_TYPES.Literal && typeof arg.value === "number") ||
        (arg.type === TSESTree.AST_NODE_TYPES.Identifier && arg.name === "undefined")
    );
}
