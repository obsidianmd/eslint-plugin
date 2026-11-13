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
 *   at `node`;
 * - `node` is not where a `try` that reads the window goes on when that
 *   throws: its `catch` or `finally`, or the code after it.
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

/**
 * Whether code at `node`, where isGlobalWindowAt holds, may still run without
 * a window as far as the file shows:
 *
 * - a condition that decides whether it runs reads a name that says which
 *   environment the code is in, such as `isBrowser`, `env.isNode`, `canUseDOM`
 *   or `typeof process`, from a check that cannot be followed here;
 * - it is in a `try` whose `catch` drops the error, as in
 *   `try { setTimeout(fn, 0); } catch {}`, where `window` failing would go
 *   unseen;
 * - the file is Emscripten output, which reads `ENVIRONMENT_IS_WORKER` or
 *   `ENVIRONMENT_IS_NODE` to run in a web worker or in Node as well, and
 *   calls the bare timers outside those checks;
 * - it is in a function whose source the file turns into a string, as in
 *   `new Blob([`(${body.toString()})()`])` for an inline web worker, where
 *   the code runs without a window.
 *
 * A rule offers its rewrite there as a suggestion, not a fix.
 */
export function mayLackWindowAt(context: Context, node: TSESTree.Node): boolean {
    const sourceCode = context.sourceCode;
    if (isEmscriptenOutput(sourceCode)) {
        return true;
    }
    const { knownChecks } = getWindowFacts(sourceCode);
    return (
        decidingConditions(node).some((condition) => readsEnvironmentName(sourceCode, condition, knownChecks)) ||
        isInSilentTry(sourceCode, node) ||
        isInStringifiedFunction(sourceCode, node)
    );
}

const stringifiedCache = new WeakMap<TSESTree.Node, boolean>();

// Whether `node` is in a function whose source the file turns into a string:
// `fn.toString()`, `String(fn)`, `` `${fn}` `` or `"…" + fn`, for the function
// itself or for a variable or function declaration that holds it. The string
// is code that runs elsewhere, typically in an inline web worker
// (`new Worker(URL.createObjectURL(new Blob([`(${body})()`])))`), which has no
// window.
function isInStringifiedFunction(sourceCode: Context["sourceCode"], node: TSESTree.Node): boolean {
    for (let current = node.parent; current; current = current.parent) {
        if (!isFunction(current)) {
            continue;
        }
        let found = stringifiedCache.get(current);
        if (found === undefined) {
            found = functionReferences(sourceCode, current).some(isStringified);
            stringifiedCache.set(current, found);
        }
        if (found) {
            return true;
        }
    }
    return false;
}

// The function expression itself and every read of the name that holds it.
function functionReferences(sourceCode: Context["sourceCode"], fn: TSESTree.Node): TSESTree.Node[] {
    const references: TSESTree.Node[] = [fn];
    let holder: TSESTree.Node | undefined;
    if (fn.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration) {
        holder = fn;
    } else {
        let top: TSESTree.Node = fn;
        while (top.parent && skipChainAndCasts(top.parent) === top) {
            top = top.parent;
        }
        if (
            top.parent?.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
            top.parent.init === top &&
            top.parent.id.type === TSESTree.AST_NODE_TYPES.Identifier
        ) {
            holder = top.parent;
        }
    }
    if (holder) {
        for (const variable of sourceCode.getDeclaredVariables(holder)) {
            for (const reference of variable.references) {
                if (reference.isRead()) {
                    references.push(reference.identifier);
                }
            }
        }
    }
    return references;
}

// Whether the value of `node`, a function, is turned into its source text.
function isStringified(node: TSESTree.Node): boolean {
    let child = node;
    let parent = node.parent;
    // Parentheses leave no node; casts and `!` do.
    while (parent && skipChainAndCasts(parent) === child) {
        child = parent;
        parent = parent.parent;
    }
    if (!parent) {
        return false;
    }
    switch (parent.type) {
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            // fn.toString()
            return (
                parent.object === child &&
                staticKey(parent) === "toString" &&
                parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                parent.parent.callee === parent
            );
        case TSESTree.AST_NODE_TYPES.TemplateLiteral:
            // `${fn}`, not a tagged template, which gets the value itself.
            return parent.parent.type !== TSESTree.AST_NODE_TYPES.TaggedTemplateExpression;
        case TSESTree.AST_NODE_TYPES.CallExpression:
            // String(fn)
            return (
                parent.arguments[0] === child &&
                parent.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
                parent.callee.name === "String"
            );
        case TSESTree.AST_NODE_TYPES.BinaryExpression: {
            // "(" + fn + ")()"
            if (parent.operator !== "+") {
                return false;
            }
            const other = parent.left === child ? parent.right : parent.left;
            return (
                (other.type === TSESTree.AST_NODE_TYPES.Literal && typeof other.value === "string") ||
                other.type === TSESTree.AST_NODE_TYPES.TemplateLiteral ||
                other.type === TSESTree.AST_NODE_TYPES.BinaryExpression
            );
        }
        default:
            return false;
    }
}

const EMSCRIPTEN_ENVIRONMENT = /\bENVIRONMENT_IS_(?:WORKER|NODE)\b/;
const emscriptenCache = new WeakMap<TSESTree.Program, boolean>();

function isEmscriptenOutput(sourceCode: Context["sourceCode"]): boolean {
    let found = emscriptenCache.get(sourceCode.ast);
    if (found === undefined) {
        found = EMSCRIPTEN_ENVIRONMENT.test(sourceCode.text);
        emscriptenCache.set(sourceCode.ast, found);
    }
    return found;
}

/**
 * Whether code at `node` may run where there is no `activeDocument` or
 * `activeWindow`, as far as the file shows. Those are Obsidian's: a browser
 * or a DOM emulation such as jsdom has a `document` and a `window` without
 * them. Code written to run there checks where it is:
 *
 * - a window check before it in the same function, or one that decides
 *   whether it runs, whatever the check finds: `typeof document`,
 *   `"window" in globalThis`, a worker check;
 * - the same for a check of Obsidian's own globals: `typeof activeDocument`,
 *   `"activeWindow" in window`, `window.activeDocument ?? …`, or a bare
 *   `activeDocument` that is only tested;
 * - it runs where a `try` that reads the window has failed, or mayLackWindowAt
 *   holds.
 *
 * A rule offers no rewrite to `activeDocument` or `activeWindow` there.
 */
export function mayRunOutsideObsidianAt(context: Context, node: TSESTree.Node): boolean {
    const facts = getWindowFacts(context.sourceCode);
    return (
        followsWindowCheck(context.sourceCode, node, true) ||
        followsCheck(facts.obsidianChecks, node, true) ||
        mayLackWindowAt(context, node)
    );
}

// A name that says which environment the code runs in: isBrowser, inBrowser,
// IS_BROWSER, isNode, isNodeJs, isNodeEnv, isWorker, inWorker, isWebWorker,
// isServer, isSSR, isElectron, hasWindow, hasDom, hasDocument, canUseDOM.
const ENVIRONMENT_NAME =
    /^(?:(?:is|in)_?(?:browser|node(?:_?js)?(?:_?env)?|(?:web_?)?worker|server|ssr|electron)|has_?(?:window|dom|document)|can_?(?:use_?)?dom)$/i;

// Whether `condition` reads an environment name, `typeof process` or
// `process.versions`, outside the functions in it and the checks this file
// follows exactly (`const hasWindow = typeof window !== "undefined"`).
function readsEnvironmentName(
    sourceCode: Context["sourceCode"],
    condition: TSESTree.Node,
    knownChecks: Set<TSESTree.Node>,
): boolean {
    const visit = (node: TSESTree.Node): boolean => {
        if (isFunction(node) || knownChecks.has(node)) {
            return false;
        }
        if (isEnvironmentRead(node)) {
            return true;
        }
        return (sourceCode.visitorKeys[node.type] ?? []).some((key) => {
            const child: unknown = (node as unknown as Record<string, unknown>)[key];
            return Array.isArray(child) ? child.some((item) => isNode(item) && visit(item)) : isNode(child) && visit(child);
        });
    };
    return visit(condition);
}

function isEnvironmentRead(node: TSESTree.Node): boolean {
    switch (node.type) {
        case TSESTree.AST_NODE_TYPES.Identifier:
            // isBrowser, env.isNode
            return ENVIRONMENT_NAME.test(node.name);
        case TSESTree.AST_NODE_TYPES.MemberExpression: {
            // env["isNode"], process.versions
            const key = staticKey(node);
            const object = skipChainAndCasts(node.object);
            return (
                key !== undefined &&
                ((node.computed && ENVIRONMENT_NAME.test(key)) ||
                    (key === "versions" &&
                        object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                        object.name === "process"))
            );
        }
        case TSESTree.AST_NODE_TYPES.UnaryExpression: {
            // typeof process
            const arg = skipChainAndCasts(node.argument);
            return (
                node.operator === "typeof" &&
                arg.type === TSESTree.AST_NODE_TYPES.Identifier &&
                arg.name === "process"
            );
        }
        default:
            return false;
    }
}

// The conditions that decide whether `node` runs: the test of each `if`, `?:`,
// loop or `switch` it is in a branch of, the left of each `&&`, `||` or `??`
// it is on the right of, and the test of each `if` before it that returns,
// throws, breaks or continues.
function decidingConditions(node: TSESTree.Node): TSESTree.Node[] {
    const conditions: TSESTree.Node[] = [];
    let child: TSESTree.Node = node;
    for (let parent = node.parent; parent; child = parent, parent = parent.parent) {
        switch (parent.type) {
            case TSESTree.AST_NODE_TYPES.IfStatement:
            case TSESTree.AST_NODE_TYPES.ConditionalExpression:
                if (parent.test !== child) {
                    conditions.push(parent.test);
                }
                break;
            case TSESTree.AST_NODE_TYPES.WhileStatement:
            case TSESTree.AST_NODE_TYPES.DoWhileStatement:
            case TSESTree.AST_NODE_TYPES.ForStatement:
                if (parent.test && parent.test !== child) {
                    conditions.push(parent.test);
                }
                break;
            case TSESTree.AST_NODE_TYPES.LogicalExpression:
                if (parent.right === child) {
                    conditions.push(parent.left);
                }
                break;
            case TSESTree.AST_NODE_TYPES.SwitchStatement:
                if (parent.discriminant !== child) {
                    conditions.push(parent.discriminant);
                }
                break;
            case TSESTree.AST_NODE_TYPES.SwitchCase:
                if (parent.test && parent.test !== child) {
                    conditions.push(parent.test);
                }
                conditions.push(...earlierExitTests(parent.consequent, child, parent.test !== child));
                break;
            case TSESTree.AST_NODE_TYPES.BlockStatement:
            case TSESTree.AST_NODE_TYPES.Program:
            case TSESTree.AST_NODE_TYPES.StaticBlock:
                conditions.push(...earlierExitTests(parent.body, child, true));
                break;
            default:
                break;
        }
    }
    return conditions;
}

// The tests of the `if`s before `child` in `statements` that leave early, or
// of all of them when `child` is not one of the statements (`inList` false).
// The `if`s of each list are found once: going over the statements before
// each node was quadratic in a long list of nodes to decide.
function earlierExitTests(statements: readonly TSESTree.Node[], child: TSESTree.Node, inList: boolean): TSESTree.Node[] {
    let exitIfs = exitIfsCache.get(statements);
    if (!exitIfs) {
        exitIfs = statements.filter(
            (statement): statement is TSESTree.IfStatement =>
                statement.type === TSESTree.AST_NODE_TYPES.IfStatement &&
                (exits(statement.consequent) || (statement.alternate !== null && exits(statement.alternate))),
        );
        exitIfsCache.set(statements, exitIfs);
    }
    // The statements before `child` are those that end before it starts.
    return exitIfs.filter((statement) => !inList || statement.range[1] <= child.range[0]).map((statement) => statement.test);
}

const exitIfsCache = new WeakMap<readonly TSESTree.Node[], TSESTree.IfStatement[]>();

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

// A check as the file holds it, with the function (or Program) it is in.
interface FoundWindowCheck extends WindowCheck {
    scope: TSESTree.Node;
}

interface WindowFacts {
    checks: FoundWindowCheck[];
    // Checks of Obsidian's `activeDocument` or `activeWindow`, which tell
    // nothing about the window itself.
    obsidianChecks: FoundWindowCheck[];
    // Each `try` whose block reads the window, so throws without one.
    windowTries: TSESTree.TryStatement[];
    // The reads and calls that hold a check whose meaning is known:
    // `hasWindow` after `const hasWindow = typeof window !== "undefined"`.
    knownChecks: Set<TSESTree.Node>;
}

const windowFactsCache = new WeakMap<TSESTree.Program, WindowFacts>();

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
// With `anyCheck`, a check that decides whether `node` runs counts whatever it
// finds: one that proves the window is there does not prove Obsidian is.
//
// Each check's function is found once per file, and `node`'s once per call:
// finding them for every check and every node was quadratic in a file with
// many checks and many nodes to decide.
function followsWindowCheck(sourceCode: Context["sourceCode"], node: TSESTree.Node, anyCheck = false): boolean {
    const facts = getWindowFacts(sourceCode);
    return (
        followsCheck(facts.checks, node, anyCheck) ||
        facts.windowTries.some((statement) => runsWhenTryFails(statement, node))
    );
}

function followsCheck(checks: FoundWindowCheck[], node: TSESTree.Node, anyCheck: boolean): boolean {
    let nodeScope: TSESTree.Node | undefined;
    return checks.some(({ condition, presentWhenTrue, scope }) => {
        if (condition.range[1] > node.range[0] || !contains(scope, node)) {
            return false;
        }
        const value = presentWhenTrue === undefined && !anyCheck ? undefined : conditionValueAt(condition, node);
        return value === undefined ? (nodeScope ??= enclosingFunction(node)) === scope : anyCheck || value !== presentWhenTrue;
    });
}

// Whether `node` runs when the block of `statement` throws: in its `catch` or
// `finally`, or after it when the `catch` goes on, as in
// `try { document.title; } catch {} setTimeout(fn, 0);`.
function runsWhenTryFails(statement: TSESTree.TryStatement, node: TSESTree.Node): boolean {
    const { handler, finalizer } = statement;
    if ((handler && contains(handler.body, node)) || (finalizer && contains(finalizer, node))) {
        return true;
    }
    return (
        handler !== null &&
        !exits(handler.body) &&
        node.range[0] >= statement.range[1] &&
        contains(statement.parent, node)
    );
}

// Whether `node` is in the block of a `try`, in the same function, whose
// `catch` drops the error: it has no parameter, or does not read it, and does
// nothing but return. `try { … } catch (e) { console.error(e); }` keeps the error.
function isInSilentTry(sourceCode: Context["sourceCode"], node: TSESTree.Node): boolean {
    let child: TSESTree.Node = node;
    for (let parent = node.parent; parent && !isFunction(parent); child = parent, parent = parent.parent) {
        if (parent.type !== TSESTree.AST_NODE_TYPES.TryStatement || parent.block !== child || !parent.handler) {
            continue;
        }
        const handler = parent.handler;
        const doesNothing = handler.body.body.every(
            (statement) =>
                statement.type === TSESTree.AST_NODE_TYPES.ReturnStatement ||
                statement.type === TSESTree.AST_NODE_TYPES.EmptyStatement,
        );
        const errorUnread = sourceCode
            .getDeclaredVariables(handler)
            .every((variable) => variable.references.every((reference) => !reference.isRead()));
        if (doesNothing && errorUnread) {
            return true;
        }
    }
    return false;
}

// The names whose read throws where there is no window.
const WINDOW_READS = new Set(["window", "document", "activeWindow", "activeDocument"]);

// Whether `node` reads the window, which throws where there is none:
// `document.title`, `activeWindow.focus()`, `globalThis.window.focus()`. Not
// `typeof window`, `el.document` or `{ document: 1 }`.
function readsWindow(node: TSESTree.Node): boolean {
    if (node.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
        const key = staticKey(node);
        const object = skipChainAndCasts(node.object);
        return (
            key !== undefined &&
            WINDOW_READS.has(key) &&
            object.type === TSESTree.AST_NODE_TYPES.Identifier &&
            GLOBAL_OBJECTS.has(object.name)
        );
    }
    if (node.type !== TSESTree.AST_NODE_TYPES.Identifier || !WINDOW_READS.has(node.name)) {
        return false;
    }
    const parent = node.parent;
    switch (parent?.type) {
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return parent.object === node || parent.computed;
        case TSESTree.AST_NODE_TYPES.Property:
            return parent.key !== node || parent.computed || parent.shorthand;
        case TSESTree.AST_NODE_TYPES.UnaryExpression:
            return parent.operator !== "typeof";
        case TSESTree.AST_NODE_TYPES.TSTypeQuery:
        case TSESTree.AST_NODE_TYPES.TSQualifiedName:
            return false;
        default:
            return true;
    }
}

function isFunction(node: TSESTree.Node): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration ||
        node.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
        node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression
    );
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

// Every window check in the file, and every `try` that reads the window,
// found on the AST alone, so that no comment, spacing or escape inside a
// check can hide it. The walk runs once per file, and only when a rule asks:
// about 20 ms for a 500 KiB file.
function getWindowFacts(sourceCode: Context["sourceCode"]): WindowFacts {
    const cached = windowFactsCache.get(sourceCode.ast);
    if (cached) {
        return cached;
    }
    const facts: WindowFacts = { checks: [], obsidianChecks: [], windowTries: [], knownChecks: new Set() };
    const followed = new Set<TSESTree.Node>();
    // Whether `node` or anything in it reads the window.
    const visit = (node: TSESTree.Node): boolean => {
        const name = checkedName(node);
        if (name !== undefined) {
            addWindowCheck(sourceCode, facts, facts.checks, toWindowCheck(node, name), followed);
        }
        const obsidianName = checkedObsidianName(node);
        if (obsidianName !== undefined) {
            addWindowCheck(sourceCode, facts, facts.obsidianChecks, toWindowCheck(node, obsidianName), followed);
        }
        let reads = readsWindow(node);
        for (const key of sourceCode.visitorKeys[node.type] ?? []) {
            const child: unknown = (node as unknown as Record<string, unknown>)[key];
            if (Array.isArray(child)) {
                for (const item of child) {
                    if (isNode(item) && visit(item)) {
                        reads = true;
                    }
                }
            } else if (isNode(child) && visit(child)) {
                reads = true;
                if (node.type === TSESTree.AST_NODE_TYPES.TryStatement && child === node.block) {
                    facts.windowTries.push(node);
                }
            }
        }
        return reads;
    };
    visit(sourceCode.ast);
    windowFactsCache.set(sourceCode.ast, facts);
    return facts;
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
    facts: WindowFacts,
    checks: FoundWindowCheck[],
    check: WindowCheck,
    followed: Set<TSESTree.Node>,
): void {
    checks.push({ ...check, scope: enclosingFunction(check.condition) });
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
        const condition = holder.isFunction ? read.parent : read;
        if (holder.isFunction && !(condition.type === TSESTree.AST_NODE_TYPES.CallExpression && condition.callee === read)) {
            continue;
        }
        if (held !== undefined) {
            facts.knownChecks.add(condition);
        }
        addWindowCheck(sourceCode, facts, checks, { condition, presentWhenTrue: held }, followed);
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

/**
 * Whether `node`, the global object, is probed for a property that may be
 * missing: `typeof globalThis.crypto`, `"requestIdleCallback" in globalThis`,
 * `!globalThis.crypto`, `globalThis.crypto?.randomUUID()`. Such code is
 * written to work where the property is missing, as in a worker or in Node,
 * and as `window` it would throw there.
 */
export function isProbeOfGlobal(node: TSESTree.Node): boolean {
    let current = node;
    for (;;) {
        const parent = current.parent;
        if (!parent) {
            return false;
        }
        if (
            (parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "typeof") ||
            (parent.type === TSESTree.AST_NODE_TYPES.BinaryExpression && parent.operator === "in" && parent.right === current) ||
            isOnlyTested(current)
        ) {
            return true;
        }
        if (!isChainLink(parent, current)) {
            return false;
        }
        current = parent;
    }
}

/**
 * Whether code at `node` runs only after a probe of the global object, as
 * isProbeOfGlobal finds it, decides that it runs:
 * `if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();`,
 * `if (!("crypto" in globalThis)) return; globalThis.crypto.getRandomValues(a);`.
 * Such code is written for where the property may be missing, and may run
 * where it is there without a window, as `crypto` is in Node. A rule offers
 * its rewrite there as a suggestion, as it does for the probe: the code alone
 * rewritten would no longer read what the probe tests, and TypeScript reports
 * a probe of a method the code then calls through another path as always
 * true (TS2774).
 */
export function followsProbeOfGlobal(sourceCode: Context["sourceCode"], node: TSESTree.Node): boolean {
    const visit = (current: TSESTree.Node): boolean => {
        if (isFunction(current)) {
            return false;
        }
        if (
            current.type === TSESTree.AST_NODE_TYPES.Identifier &&
            GLOBAL_OBJECTS.has(current.name) &&
            // `typeof globalThis`: whether there is a global object, not a probe of it.
            !(current.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && current.parent.operator === "typeof") &&
            // `if (!globalThis.window) return;`: what follows has a window.
            !isInWindowCheck(current) &&
            isProbeOfGlobal(current)
        ) {
            return true;
        }
        return (sourceCode.visitorKeys[current.type] ?? []).some((key) => {
            const child: unknown = (current as unknown as Record<string, unknown>)[key];
            return Array.isArray(child) ? child.some((item) => isNode(item) && visit(item)) : isNode(child) && visit(child);
        });
    };
    return decidingConditions(node).some(visit);
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

// Obsidian's globals, which a browser or jsdom does not have, and the objects
// they are read from when the code expects them to be missing.
const OBSIDIAN_WINDOW_NAMES = new Set(["activeDocument", "activeWindow"]);
const OBSIDIAN_GLOBAL_OBJECTS = new Set([...GLOBAL_OBJECTS, "window"]);

// The Obsidian global that `node` checks for: `typeof activeDocument`,
// `typeof window.activeWindow`, `"activeDocument" in window`, a chain on the
// global object or `window` that is only tested (`window.activeDocument ?? …`),
// or a bare `activeDocument` that is only tested.
function checkedObsidianName(node: TSESTree.Node): string | undefined {
    const nameOf = (name: string | undefined) => (name !== undefined && OBSIDIAN_WINDOW_NAMES.has(name) ? name : undefined);
    if (node.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.operator === "typeof") {
        const arg = skipChainAndCasts(node.argument);
        return nameOf(arg.type === TSESTree.AST_NODE_TYPES.Identifier ? arg.name : chainedKey(arg, OBSIDIAN_WINDOW_NAMES));
    }
    if (node.type === TSESTree.AST_NODE_TYPES.BinaryExpression && node.operator === "in") {
        return nameOf(node.left.type === TSESTree.AST_NODE_TYPES.PrivateIdentifier ? undefined : staticString(node.left));
    }
    if (!isOnlyTested(node)) {
        return undefined;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return nameOf(node.name);
    }
    const root = chainRoot(node);
    return root.type === TSESTree.AST_NODE_TYPES.Identifier && OBSIDIAN_GLOBAL_OBJECTS.has(root.name)
        ? chainedKey(node, OBSIDIAN_WINDOW_NAMES)
        : undefined;
}

// The first key of `names` in the member chain `node`, from its end.
function chainedKey(node: TSESTree.Node, names: Set<string>): string | undefined {
    let current = skipChainAndCasts(node);
    while (current.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
        const key = staticKey(current);
        if (key !== undefined && names.has(key)) {
            return key;
        }
        current = skipChainAndCasts(current.object);
    }
    return undefined;
}

// The object the member chain `node` starts from.
function chainRoot(node: TSESTree.Node): TSESTree.Node {
    let current = skipChainAndCasts(node);
    while (current.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
        current = skipChainAndCasts(current.object);
    }
    return current;
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
        const key = staticKey(current);
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

// The name of the property `member` reads, when it is written out.
function staticKey(member: TSESTree.MemberExpression): string | undefined {
    if (member.computed) {
        return staticString(member.property);
    }
    return member.property.type === TSESTree.AST_NODE_TYPES.Identifier ? member.property.name : undefined;
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
