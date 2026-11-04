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

// Names that are there only with a window, and names that only a web worker
// has. A worker check does not prove a window either way: Node has neither.
const WINDOW_NAMES = new Set(["window", "document"]);
const WORKER_NAMES = new Set([
    "importScripts",
    "WorkerGlobalScope",
    "DedicatedWorkerGlobalScope",
    "SharedWorkerGlobalScope",
    "ServiceWorkerGlobalScope",
]);
// The global object, as `globalThis.window` or `self.document` reads it.
const GLOBAL_OBJECTS = new Set(["globalThis", "global", "self"]);
const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);

interface WindowCheck {
    // `typeof window === "undefined"`, `"window" in globalThis`, the
    // `globalThis.window` of `!globalThis.window`, or a read of a constant or
    // a call of a function whose value is such a check.
    condition: TSESTree.Node;
    // Whether the window is there when `condition` is true, or undefined when
    // that does not follow, as for `typeof window` on its own, a worker check
    // or `typeof window !== "undefined" && ready`.
    presentWhenTrue: boolean | undefined;
}

const windowChecksCache = new WeakMap<TSESTree.Program, WindowCheck[]>();

// A check before `node` says the code also runs where there is no window, as
// in `typeof window === "undefined" ? globalThis.setTimeout(…) : window.setTimeout(…)`,
// where `window` would not exist (and TypeScript narrows it to `never`).
// Where the check's `if`, `?:`, `&&` or `||` decides whether `node` runs, it
// lets `node` through only if it proves the window is there:
// `if (typeof document === "undefined") return;` before it, or the branch of
// `typeof window !== "undefined" ? … : …` that it is in. A check that does not
// decide it, such as `const browser = typeof window !== "undefined"`, still
// counts in the same function, but not in the functions nested in it; there,
// each read of `browser` is a check of its own.
function followsWindowCheck(sourceCode: Context["sourceCode"], node: TSESTree.Node): boolean {
    return getWindowChecks(sourceCode).some(({ condition, presentWhenTrue }) => {
        const scope = enclosingFunction(condition);
        if (condition.range[1] > node.range[0] || !contains(scope, node)) {
            return false;
        }
        const value = presentWhenTrue === undefined ? undefined : conditionValueAt(condition, node);
        return value === undefined ? enclosingFunction(node) === scope : value !== presentWhenTrue;
    });
}

// The condition `check` (see isWindowCheck) makes.
function toWindowCheck(check: TSESTree.Node, name: string): WindowCheck {
    const forWindow = WINDOW_NAMES.has(name);
    if (check.type === TSESTree.AST_NODE_TYPES.BinaryExpression && check.operator === "in") {
        // "window" in globalThis
        return { condition: check, presentWhenTrue: forWindow ? true : undefined };
    }
    const comparison = check.parent;
    const isTypeof = check.type === TSESTree.AST_NODE_TYPES.UnaryExpression && check.operator === "typeof";
    if (comparison?.type === TSESTree.AST_NODE_TYPES.BinaryExpression && EQUALITY_OPERATORS.has(comparison.operator)) {
        const other = comparison.left === check ? comparison.right : comparison.left;
        const equal = comparison.operator === "===" || comparison.operator === "==";
        if (isTypeof) {
            // typeof window === "undefined", typeof document !== "object"
            const type =
                other.type === TSESTree.AST_NODE_TYPES.Literal && typeof other.value === "string"
                    ? other.value
                    : undefined;
            return {
                condition: type === undefined ? check : comparison,
                presentWhenTrue: forWindow && type !== undefined ? equal === (type !== "undefined") : undefined,
            };
        }
        // globalThis.window === undefined, globalThis.document != null. Only
        // undefined tells: `globalThis.window === null` is false either way.
        const looselyNull =
            comparison.operator.length === 2 &&
            other.type === TSESTree.AST_NODE_TYPES.Literal &&
            other.value === null;
        const absent = isUndefined(other) || looselyNull;
        return { condition: comparison, presentWhenTrue: forWindow && absent ? !equal : undefined };
    }
    // `typeof window` on its own; `!globalThis.window`, `globalThis.document?.body`
    return { condition: check, presentWhenTrue: forWindow && !isTypeof ? true : undefined };
}

function isUndefined(node: TSESTree.Node): boolean {
    return (
        (node.type === TSESTree.AST_NODE_TYPES.Identifier && node.name === "undefined") ||
        (node.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.operator === "void")
    );
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

// Every window check in the file, found on the AST alone, so that no comment,
// spacing or escape inside a check can hide it. The walk runs once per file,
// and only when a rule asks: about 20 ms for a 500 KiB file.
function getWindowChecks(sourceCode: Context["sourceCode"]): WindowCheck[] {
    const cached = windowChecksCache.get(sourceCode.ast);
    if (cached) {
        return cached;
    }
    const checks: WindowCheck[] = [];
    const followed = new Set<TSESTree.Node>();
    const visit = (node: TSESTree.Node): void => {
        const name = checkedName(node);
        if (name !== undefined) {
            addWindowCheck(sourceCode, checks, toWindowCheck(node, name), followed);
        }
        for (const key of sourceCode.visitorKeys[node.type] ?? []) {
            const child: unknown = (node as unknown as Record<string, unknown>)[key];
            if (Array.isArray(child)) {
                for (const item of child) {
                    if (isNode(item)) {
                        visit(item);
                    }
                }
            } else if (isNode(child)) {
                visit(child);
            }
        }
    };
    visit(sourceCode.ast);
    windowChecksCache.set(sourceCode.ast, checks);
    return checks;
}

function isNode(value: unknown): value is TSESTree.Node {
    return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

// Adds `check`, and where its value is held for later, each read of it:
// `const browser = typeof window !== "undefined"` makes `browser` a check
// wherever it is read, and `const hasWindow = () => "window" in globalThis`
// makes each `hasWindow()` one.
function addWindowCheck(
    sourceCode: Context["sourceCode"],
    checks: WindowCheck[],
    check: WindowCheck,
    followed: Set<TSESTree.Node>,
): void {
    checks.push(check);
    // `!` keeps what the value says; `&&` and `||` lose it.
    let value: TSESTree.Node = check.condition;
    let presentWhenTrue = check.presentWhenTrue;
    for (let parent = value.parent; parent; parent = value.parent) {
        if (parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "!") {
            presentWhenTrue = presentWhenTrue === undefined ? undefined : !presentWhenTrue;
        } else if (parent.type === TSESTree.AST_NODE_TYPES.LogicalExpression) {
            presentWhenTrue = undefined;
        } else {
            break;
        }
        value = parent;
    }
    const holder = valueHolder(value);
    if (!holder || followed.has(holder.declaration)) {
        return;
    }
    followed.add(holder.declaration);
    const held = holder.exact ? presentWhenTrue : undefined;
    // A function declaration also declares its parameters.
    const variable = sourceCode.getDeclaredVariables(holder.declaration).find((v) => v.name === holder.name);
    for (const reference of variable?.references ?? []) {
        const read = reference.identifier;
        if (!reference.isRead() || read.type !== TSESTree.AST_NODE_TYPES.Identifier) {
            continue;
        }
        if (!holder.isFunction) {
            addWindowCheck(sourceCode, checks, { condition: read, presentWhenTrue: held }, followed);
        } else if (read.parent.type === TSESTree.AST_NODE_TYPES.CallExpression && read.parent.callee === read) {
            addWindowCheck(sourceCode, checks, { condition: read.parent, presentWhenTrue: held }, followed);
        }
    }
}

// The declaration that holds `value` for later: the `const`, `let` or `var`
// it initialises, or the function that returns it. `exact` when that is all
// it can be: a `const`, or a function that does nothing else.
function valueHolder(
    value: TSESTree.Node,
): { declaration: TSESTree.Node; name: string; isFunction: boolean; exact: boolean } | undefined {
    const parent = value.parent;
    if (
        parent?.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
        parent.init === value &&
        parent.id.type === TSESTree.AST_NODE_TYPES.Identifier
    ) {
        return { declaration: parent, name: parent.id.name, isFunction: false, exact: parent.parent.kind === "const" };
    }
    let fn: TSESTree.Node | undefined;
    let exact = false;
    if (parent?.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression && parent.body === value) {
        // const hasWindow = () => typeof window !== "undefined";
        fn = parent;
        exact = true;
    } else if (parent?.type === TSESTree.AST_NODE_TYPES.ReturnStatement) {
        // function hasWindow() { return typeof window !== "undefined"; }
        fn = enclosingFunction(parent);
        const body = fn.type === TSESTree.AST_NODE_TYPES.Program ? undefined : (fn as TSESTree.FunctionLike).body;
        exact =
            body?.type === TSESTree.AST_NODE_TYPES.BlockStatement && body.body.length === 1 && body.body[0] === parent;
    }
    if (fn?.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration && fn.id) {
        return { declaration: fn, name: fn.id.name, isFunction: true, exact };
    }
    if (
        (fn?.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
            fn?.type === TSESTree.AST_NODE_TYPES.FunctionExpression) &&
        fn.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
        fn.parent.init === fn &&
        fn.parent.id.type === TSESTree.AST_NODE_TYPES.Identifier
    ) {
        const exactConst = exact && fn.parent.parent.kind === "const";
        return { declaration: fn.parent, name: fn.parent.id.name, isFunction: true, exact: exactConst };
    }
    return undefined;
}

/**
 * Whether `node` checks for a window, or for a web worker, which has none:
 *
 * - `typeof` one of `window`, `document`, `importScripts` or the
 *   `WorkerGlobalScope`s, or of a property with such a name anywhere in a
 *   chain: `typeof globalThis.document`, `typeof globalThis?.["window"]`,
 *   `typeof globalThis.window?.document`;
 * - `"window" in globalThis`, `` `document` in self ``;
 * - `globalThis.window`, `global.window` or `self.document` (any such chain on
 *   the global object) tested on its own: `!globalThis.window`,
 *   `if (globalThis.document)`, `globalThis.window && …`,
 *   `globalThis.window === undefined`, `globalThis.document?.body`.
 *
 * Rewriting the `globalThis` in such a check to `window` would throw where it is false.
 */
function isWindowCheck(node: TSESTree.Node): boolean {
    return checkedName(node) !== undefined;
}

/**
 * Whether `node` is part of a window check: the `globalThis` in
 * `typeof globalThis.document`, `"window" in globalThis` or
 * `!(globalThis as any).window`. As `window`, the check would throw where it
 * is false.
 */
export function isInWindowCheck(node: TSESTree.Node): boolean {
    let current = node;
    for (;;) {
        if (isWindowCheck(current)) {
            return true;
        }
        const parent = current.parent;
        if (!parent) {
            return false;
        }
        if (!isChainLink(parent, current)) {
            return isWindowCheck(parent);
        }
        current = parent;
    }
}

// The window or worker name that `node` checks for, if it is a window check.
function checkedName(node: TSESTree.Node): string | undefined {
    if (node.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.operator === "typeof") {
        const arg = skipChainAndCasts(node.argument);
        return arg.type === TSESTree.AST_NODE_TYPES.Identifier ? environmentName(arg.name) : chainedName(arg);
    }
    if (node.type === TSESTree.AST_NODE_TYPES.BinaryExpression && node.operator === "in") {
        const key = node.left.type === TSESTree.AST_NODE_TYPES.PrivateIdentifier ? undefined : staticString(node.left);
        return key === undefined ? undefined : environmentName(key);
    }
    return isOnlyTested(node) ? chainedName(node, GLOBAL_OBJECTS) : undefined;
}

function environmentName(name: string): string | undefined {
    return WINDOW_NAMES.has(name) || WORKER_NAMES.has(name) ? name : undefined;
}

// The window or worker name of a property in the member chain `node`, as in
// `globalThis.document` or `globalThis.window?.document`; with `roots`, only in
// a chain on an object of one of those names.
function chainedName(node: TSESTree.Node, roots?: Set<string>): string | undefined {
    let name: string | undefined;
    let current = skipChainAndCasts(node);
    while (current.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
        const key = current.computed
            ? staticString(current.property)
            : current.property.type === TSESTree.AST_NODE_TYPES.Identifier
              ? current.property.name
              : undefined;
        name ??= key === undefined ? undefined : environmentName(key);
        current = skipChainAndCasts(current.object);
    }
    if (roots && !(current.type === TSESTree.AST_NODE_TYPES.Identifier && roots.has(current.name))) {
        return undefined;
    }
    return name;
}

// Whether only the truth of `node` is used: `!node`, `node && …`, `if (node)`,
// `node === undefined`, `node?.x`.
function isOnlyTested(node: TSESTree.Node): boolean {
    const parent = node.parent;
    switch (parent?.type) {
        case TSESTree.AST_NODE_TYPES.UnaryExpression:
            return parent.operator === "!";
        case TSESTree.AST_NODE_TYPES.LogicalExpression:
            // The right of `a && b` is its value, unless that is only tested too.
            return parent.left === node || isOnlyTested(parent);
        case TSESTree.AST_NODE_TYPES.BinaryExpression:
            return EQUALITY_OPERATORS.has(parent.operator);
        case TSESTree.AST_NODE_TYPES.IfStatement:
        case TSESTree.AST_NODE_TYPES.ConditionalExpression:
        case TSESTree.AST_NODE_TYPES.WhileStatement:
        case TSESTree.AST_NODE_TYPES.DoWhileStatement:
        case TSESTree.AST_NODE_TYPES.ForStatement:
            return parent.test === node;
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return parent.object === node && parent.optional;
        case TSESTree.AST_NODE_TYPES.CallExpression:
            return parent.callee === node && parent.optional;
        default:
            return false;
    }
}

// Whether `parent` reads a property of `child` or only changes its type:
// `child.x`, `child?.x`, `child!`, `child as T`.
function isChainLink(parent: TSESTree.Node, child: TSESTree.Node): boolean {
    switch (parent.type) {
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return parent.object === child;
        case TSESTree.AST_NODE_TYPES.ChainExpression:
        case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
        case TSESTree.AST_NODE_TYPES.TSAsExpression:
        case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
        case TSESTree.AST_NODE_TYPES.TSTypeAssertion:
            return parent.expression === child;
        default:
            return false;
    }
}

function skipChainAndCasts(node: TSESTree.Node): TSESTree.Node {
    while (
        node.type === TSESTree.AST_NODE_TYPES.ChainExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion
    ) {
        node = node.expression;
    }
    return node;
}

// The value of a string literal, or of a template literal without expressions.
function staticString(node: TSESTree.Node): string | undefined {
    if (node.type === TSESTree.AST_NODE_TYPES.Literal) {
        return typeof node.value === "string" ? node.value : undefined;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return node.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
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
