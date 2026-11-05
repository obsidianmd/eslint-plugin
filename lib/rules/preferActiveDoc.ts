import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { disableDirectives, isDisabled, problemStart } from "../disableDirectives.js";
import { getTypeInfo, hasLocalBinding, mayRunOutsideObsidianAt } from "../globalWindow.js";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../minAppVersion.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";
import { isWorkerFile } from "../workerGlobals.js";
import { isReportedOnGlobalDocument } from "./preferCreateEl.js";

// `window` is left alone: timers belong on the main window rather than on
// activeWindow (see prefer-window-timers), and so do many of its other uses.
const REPLACEMENTS: Record<string, string> = {
    document: "activeDocument",
};

// The files the recommended config runs prefer-create-el on, given type
// information: its `**/*.{ts,cts,mts,tsx}` block.
const TYPESCRIPT_FILE = /\.(?:ts|cts|mts|tsx)$/;

// The Obsidian version that added popout windows, and `activeDocument` with them.
const ACTIVE_DOCUMENT_SINCE = "0.15.0";

// The objects a property set on lives as long as the plugin: the global
// object, and a CommonJS module's exports.
const GLOBAL_OBJECTS = new Set(["window", "globalThis", "global", "self", "activeWindow", "module", "exports"]);
const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);
// The calls that attach a listener to their target: `target.addEventListener()`
// and its removal, and Obsidian's `registerDomEvent(target, …)`.
const LISTENER_METHODS = new Set(["addEventListener", "removeEventListener"]);
const REGISTER_DOM_EVENT = "registerDomEvent";
// The globals a listener can be registered on whose events come from the main
// window, so that `document` in the listener is that window's document.
const MAIN_WINDOW_TARGETS = new Set(["document", "window"]);
// The scopes whose variables live as long as the plugin: the module, the
// script, and a `namespace`.
const MODULE_SCOPES = new Set<string>(["module", "global", "tsModule"]);

type MessageIds = "preferActive" | "useActiveDocument" | "useActiveDocumentSince";

// Each scope's references by the identifier that makes them.
const referencesByScope = new WeakMap<object, Map<TSESTree.Node, TSESLint.Scope.Reference>>();

export default ruleCreator<MinAppVersionOptions, MessageIds>({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `activeDocument` over `document` for popout window compatibility.",
            url: docsUrl("prefer-active-doc"),
        },
        schema: minAppVersionSchema,
        fixable: undefined,
        hasSuggestions: true,
        messages: {
            preferActive:
                "Use '{{replacement}}' instead of '{{original}}' for popout window compatibility.",
            useActiveDocument: "Replace with `activeDocument`, the document of the window that has focus.",
            useActiveDocumentSince:
                "Replace with `activeDocument`, the document of the window that has focus (needs Obsidian {{since}} or later).",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const supported = supportsVersion(context.options[0]?.minAppVersion, ACTIVE_DOCUMENT_SINCE);
        // A worker has no `activeDocument`, and the recommended config turns
        // the global off there; so may a config of the plugin's own.
        const offerable =
            supported !== false &&
            !isWorkerFile(context.filename, context.cwd) &&
            context.languageOptions.globals?.activeDocument !== "off";
        const types = getTypeInfo(context);

        // prefer-create-el needs type information, and the recommended config
        // runs it on TypeScript files only.
        const createElRuns =
            Boolean(context.sourceCode.parserServices?.program) &&
            TYPESCRIPT_FILE.test(context.filename);
        // prefer-create-el under the prefix this plugin is registered with.
        const createElId = context.id.replace(/prefer-active-doc$/, "prefer-create-el");

        // Whether a comment turns prefer-create-el off where it would report
        // `call`, so it reports nothing there. Turning it off in the config is
        // not visible to another rule.
        function createElDisabledAt(call: TSESTree.CallExpression): boolean {
            return isDisabled(
                disableDirectives(context.sourceCode),
                problemStart({ node: call, messageId: "preferActive" }),
                (ruleId) => ruleId === createElId,
            );
        }

        return {
            Identifier(node: TSESTree.Identifier) {
                if (!Object.hasOwn(REPLACEMENTS, node.name)) {
                    return;
                }

                const replacement = REPLACEMENTS[node.name];

                // Skip identifiers in type-level constructs (interfaces, type aliases, type annotations, etc.)
                if (isInTypeContext(node)) {
                    return;
                }

                // Skip if this is a property access (e.g., `obj.document`), but not a
                // computed one (`obj[document]` reads the global)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.property === node &&
                    !node.parent.computed
                ) {
                    return;
                }

                // Skip if this is a property key in an object literal, but not a
                // computed one (`{ [document]: 1 }` reads the global)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.key === node &&
                    !node.parent.computed
                ) {
                    return;
                }

                // Skip if this is a declaration (variable, function param, etc.)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.id === node
                ) {
                    return;
                }

                // Skip typeof expressions (typeof window === 'undefined')
                if (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") {
                    return;
                }

                // Skip class member names (key position), including abstract members and
                // accessors, but not computed keys (`[document]` reads the global)
                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.PropertyDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.AccessorProperty ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractPropertyDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractMethodDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractAccessorProperty) &&
                    node.parent.key === node &&
                    !node.parent.computed
                ) {
                    return;
                }

                // Skip enum member names (but NOT initializers — enum initializers are runtime code)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.TSEnumMember &&
                    node.parent.id === node
                ) {
                    return;
                }

                // Skip labeled statements and break/continue label references
                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.LabeledStatement &&
                     node.parent.label === node) ||
                    ((node.parent.type === TSESTree.AST_NODE_TYPES.BreakStatement ||
                      node.parent.type === TSESTree.AST_NODE_TYPES.ContinueStatement) &&
                     node.parent.label === node)
                ) {
                    return;
                }

                // Check scope: only flag global references, not local variables named document/window
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                // In a listener on the main window, `document.visibilityState`
                // or `document.querySelector()` reads the document of the window
                // whose event it handles: correct as written. The registration
                // itself is reported (see isListenerTarget).
                if (isInMainWindowListener(node)) {
                    return;
                }

                // Leave `document.createElement("p")` and the other calls
                // prefer-create-el reports to it: its createEl("p") drops
                // `document`, while activeDocument.createElement("p") would
                // still be reported by it. Where a comment disables
                // prefer-create-el for the call, report `document` as before.
                if (
                    createElRuns &&
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.object === node &&
                    node.parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.parent.parent.callee === node.parent &&
                    isReportedOnGlobalDocument(node.parent.parent) &&
                    !createElDisabledAt(node.parent.parent)
                ) {
                    return;
                }

                context.report({
                    node,
                    messageId: "preferActive",
                    data: {
                        original: node.name,
                        replacement,
                    },
                    suggest: offerable && canSuggestAt(node) ? [suggestion(node)] : [],
                });
            },
        };

        function suggestion(node: TSESTree.Identifier): TSESLint.SuggestionReportDescriptor<MessageIds> {
            // `{ document }` keeps its key.
            const text =
                node.parent.type === TSESTree.AST_NODE_TYPES.Property && node.parent.shorthand
                    ? "document: activeDocument"
                    : "activeDocument";
            const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(node, text);
            return supported === undefined
                ? { messageId: "useActiveDocumentSince", data: { since: ACTIVE_DOCUMENT_SINCE }, fix }
                : { messageId: "useActiveDocument", fix };
        }

        // Whether `activeDocument` written in place of the global `document` at
        // `node` is that global, and does what the code meant.
        function canSuggestAt(node: TSESTree.Identifier): boolean {
            const scope = context.sourceCode.getScope(node);
            // A parameter or a variable of that name, or no such global in the
            // plugin's typings.
            if (hasLocalBinding(scope, "activeDocument")) {
                return false;
            }
            if (types && !types.checker.resolveName("activeDocument", types.toTs(node), ts.SymbolFlags.Value, false)) {
                return false;
            }
            // `document = …`, `({ document } = …)`, `export { document }`.
            const reference = findReference(scope, node);
            if (!reference?.isReadOnly() || node.parent.type === TSESTree.AST_NODE_TYPES.ExportSpecifier) {
                return false;
            }
            // Code that also runs in a browser, or under jsdom, has a
            // `document` but no `activeDocument`.
            if (mayRunOutsideObsidianAt(context, node)) {
                return false;
            }
            return !isComparedOrStored(node) && !isListenerTarget(node);
        }

        // `node` under casts and `!`, as the value it stands for.
        function outerValue(node: TSESTree.Node): TSESTree.Node {
            let value = node;
            while (
                value.parent &&
                (value.parent.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    value.parent.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                    value.parent.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                    value.parent.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion)
            ) {
                value = value.parent;
            }
            return value;
        }

        // The call that makes `value` a listener's target, if any:
        // `value.addEventListener(…)`, `value.removeEventListener(…)` or
        // `registerDomEvent(value, …)`, also as a method (`this.registerDomEvent`).
        function listenerCallOn(node: TSESTree.Node): TSESTree.CallExpression | null {
            const value = outerValue(node);
            const parent = value.parent;
            if (
                parent?.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                parent.object === value &&
                !parent.computed &&
                parent.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                LISTENER_METHODS.has(parent.property.name) &&
                parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                parent.parent.callee === parent
            ) {
                return parent.parent;
            }
            if (parent?.type === TSESTree.AST_NODE_TYPES.CallExpression && parent.arguments[0] === value) {
                const callee = parent.callee;
                const name =
                    callee.type === TSESTree.AST_NODE_TYPES.Identifier
                        ? callee.name
                        : callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                            !callee.computed &&
                            callee.property.type === TSESTree.AST_NODE_TYPES.Identifier
                          ? callee.property.name
                          : undefined;
                if (name === REGISTER_DOM_EVENT) {
                    return parent;
                }
            }
            return null;
        }

        // Whether the document is a listener's target, directly or through a
        // local variable: `this.registerDomEvent(document, "keydown", …)`,
        // `document.removeEventListener(…)`, or `const doc = document;` then
        // `doc.addEventListener(…)`. The listener stays on that document for as
        // long as it lives, and a removal has to name the document it was added
        // to; `activeDocument` would pick whichever window had focus.
        function isListenerTarget(node: TSESTree.Identifier): boolean {
            if (listenerCallOn(node)) {
                return true;
            }
            const value = outerValue(node);
            const declarator = value.parent;
            if (
                declarator?.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== value ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier
            ) {
                return false;
            }
            return context.sourceCode
                .getDeclaredVariables(declarator)
                .some((variable) => variable.references.some((reference) =>
                    !reference.init && listenerCallOn(reference.identifier) !== null));
        }

        // Whether `node` is in a listener registered on the main window's
        // `document` or `window`, given inline: `this.registerDomEvent(document,
        // "visibilitychange", () => { … document.visibilityState … })` or
        // `window.addEventListener("keydown", (e) => { … })`.
        function isInMainWindowListener(node: TSESTree.Node): boolean {
            for (let current = node.parent; current; current = current.parent) {
                if (
                    current.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                    current.type !== TSESTree.AST_NODE_TYPES.FunctionExpression
                ) {
                    continue;
                }
                const call = current.parent;
                if (call?.type === TSESTree.AST_NODE_TYPES.CallExpression && call.arguments.includes(current)) {
                    if (mainWindowTargetOf(call) !== null) {
                        return true;
                    }
                    continue;
                }
                if (isMainWindowListenerOnly(current)) {
                    return true;
                }
            }
            return false;
        }

        // Whether `fn`, declared as `const onKey = (e) => { … }`, is only ever
        // added or removed as a listener on the main window's `document` or
        // `window`. Passed anywhere else, also to a pop-out's window, or
        // called, it may run for another window's events.
        function isMainWindowListenerOnly(
            fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
        ): boolean {
            const declarator = fn.parent;
            if (
                declarator?.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== fn ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier
            ) {
                return false;
            }
            const references = context.sourceCode
                .getDeclaredVariables(declarator)
                .flatMap((variable) => variable.references)
                .filter((reference) => !reference.init);
            return (
                references.length > 0 &&
                references.every((reference) => {
                    const identifier = reference.identifier;
                    const call = identifier.parent;
                    return (
                        identifier.type === TSESTree.AST_NODE_TYPES.Identifier &&
                        call?.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                        call.arguments.includes(identifier) &&
                        mainWindowTargetOf(call, true) !== null
                    );
                })
            );
        }

        // The global `document` or `window` that `call` registers a listener
        // on, if it does; with `orRemoval`, also one it removes a listener from.
        function mainWindowTargetOf(call: TSESTree.CallExpression, orRemoval = false): TSESTree.Identifier | null {
            let target: TSESTree.Node | undefined;
            const callee = call.callee;
            if (
                callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !callee.computed &&
                callee.property.type === TSESTree.AST_NODE_TYPES.Identifier
            ) {
                if (
                    callee.property.name === "addEventListener" ||
                    (orRemoval && callee.property.name === "removeEventListener")
                ) {
                    target = callee.object;
                } else if (callee.property.name === REGISTER_DOM_EVENT) {
                    target = call.arguments[0];
                }
            } else if (callee.type === TSESTree.AST_NODE_TYPES.Identifier && callee.name === REGISTER_DOM_EVENT) {
                target = call.arguments[0];
            }
            while (
                target &&
                (target.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    target.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression)
            ) {
                target = target.expression;
            }
            if (
                target?.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                !MAIN_WINDOW_TARGETS.has(target.name) ||
                hasLocalBinding(context.sourceCode.getScope(target), target.name)
            ) {
                return null;
            }
            return target;
        }

        // The reference `node` makes, from the scope it is in. Each scope's
        // references are mapped once (referencesByScope): searching them for
        // each `document` was quadratic in a scope with many references.
        function findReference(
            scope: ReturnType<typeof context.sourceCode.getScope>,
            node: TSESTree.Identifier,
        ): TSESLint.Scope.Reference | undefined {
            let references = referencesByScope.get(scope);
            if (!references) {
                references = new Map();
                for (const reference of scope.references) {
                    if (!references.has(reference.identifier)) {
                        references.set(reference.identifier, reference);
                    }
                }
                referencesByScope.set(scope, references);
            }
            return references.get(node);
        }

        // Whether the document itself is compared, as in `target === document`,
        // or kept where later code reads it whatever window has focus then: a
        // variable of the module, a property of the global object, a default
        // export or a static field. `activeDocument` there would compare with,
        // or keep, whichever document had focus.
        function isComparedOrStored(node: TSESTree.Identifier): boolean {
            let value: TSESTree.Node = node;
            for (let parent = value.parent; parent; parent = value.parent) {
                switch (parent.type) {
                    case TSESTree.AST_NODE_TYPES.TSAsExpression:
                    case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
                    case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
                    case TSESTree.AST_NODE_TYPES.TSTypeAssertion:
                    case TSESTree.AST_NODE_TYPES.LogicalExpression:
                    case TSESTree.AST_NODE_TYPES.ArrayExpression:
                    case TSESTree.AST_NODE_TYPES.ObjectExpression:
                        break;
                    case TSESTree.AST_NODE_TYPES.ConditionalExpression:
                        if (parent.test === value) {
                            return false;
                        }
                        break;
                    case TSESTree.AST_NODE_TYPES.SequenceExpression:
                        if (parent.expressions.at(-1) !== value) {
                            return false;
                        }
                        break;
                    case TSESTree.AST_NODE_TYPES.Property:
                        if (parent.value !== value || parent.parent.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
                            return false;
                        }
                        break;
                    case TSESTree.AST_NODE_TYPES.BinaryExpression:
                        // Only the document itself: `document.body === el` compares an element.
                        return isCast(node, value) && EQUALITY_OPERATORS.has(parent.operator);
                    case TSESTree.AST_NODE_TYPES.SwitchCase:
                        return parent.test === value && isCast(node, value);
                    case TSESTree.AST_NODE_TYPES.SwitchStatement:
                        return parent.discriminant === value && isCast(node, value);
                    case TSESTree.AST_NODE_TYPES.VariableDeclarator:
                        return parent.init === value && isModuleLevel(parent);
                    case TSESTree.AST_NODE_TYPES.AssignmentExpression:
                        return parent.right === value && isGlobalTarget(parent.left);
                    case TSESTree.AST_NODE_TYPES.ExportDefaultDeclaration:
                        return true;
                    case TSESTree.AST_NODE_TYPES.PropertyDefinition:
                        return parent.value === value && parent.static;
                    default:
                        return false;
                }
                value = parent;
            }
            return false;
        }

        // Whether `outer` is `node`, or `node` under casts only, as in
        // `(document as any)`.
        function isCast(node: TSESTree.Node, outer: TSESTree.Node): boolean {
            let current: TSESTree.Node = node;
            while (current !== outer) {
                const parent: TSESTree.Node | undefined = current.parent;
                if (
                    parent?.type !== TSESTree.AST_NODE_TYPES.TSAsExpression &&
                    parent?.type !== TSESTree.AST_NODE_TYPES.TSNonNullExpression &&
                    parent?.type !== TSESTree.AST_NODE_TYPES.TSSatisfiesExpression &&
                    parent?.type !== TSESTree.AST_NODE_TYPES.TSTypeAssertion
                ) {
                    return false;
                }
                current = parent;
            }
            return true;
        }

        // Whether `declarator` declares a variable of the module or the script.
        function isModuleLevel(declarator: TSESTree.VariableDeclarator): boolean {
            return context.sourceCode
                .getDeclaredVariables(declarator)
                .some((variable) => MODULE_SCOPES.has(variable.scope.type));
        }

        // Whether `target` is a variable of the module or the script, an
        // undeclared global, or a property of the global object or of
        // `module.exports`.
        function isGlobalTarget(target: TSESTree.Node): boolean {
            if (target.type === TSESTree.AST_NODE_TYPES.Identifier) {
                const reference = findReference(context.sourceCode.getScope(target), target);
                const scopeType = reference?.resolved?.scope.type;
                return scopeType === undefined || MODULE_SCOPES.has(scopeType);
            }
            let object: TSESTree.Node = target;
            while (
                object.type === TSESTree.AST_NODE_TYPES.MemberExpression ||
                object.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                object.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression
            ) {
                object = object.type === TSESTree.AST_NODE_TYPES.MemberExpression ? object.object : object.expression;
            }
            return (
                object !== target &&
                object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                GLOBAL_OBJECTS.has(object.name) &&
                !hasLocalBinding(context.sourceCode.getScope(object), object.name)
            );
        }

        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                // By name, rather than a search of each scope's variables: the
                // global scope holds every name of TypeScript's lib.
                const variable = current.set.get(name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }

        function isInTypeContext(node: TSESTree.Node): boolean {
            let current: TSESTree.Node | undefined = node.parent;
            while (current) {
                switch (current.type) {
                    case TSESTree.AST_NODE_TYPES.TSTypeAnnotation:
                    case TSESTree.AST_NODE_TYPES.TSTypeQuery:
                    case TSESTree.AST_NODE_TYPES.TSQualifiedName:
                    case TSESTree.AST_NODE_TYPES.TSPropertySignature:
                    case TSESTree.AST_NODE_TYPES.TSMethodSignature:
                    case TSESTree.AST_NODE_TYPES.TSIndexSignature:
                    case TSESTree.AST_NODE_TYPES.TSTypeLiteral:
                    case TSESTree.AST_NODE_TYPES.TSInterfaceBody:
                    case TSESTree.AST_NODE_TYPES.TSInterfaceDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeAliasDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeReference:
                    case TSESTree.AST_NODE_TYPES.TSMappedType:
                    case TSESTree.AST_NODE_TYPES.TSConditionalType:
                    case TSESTree.AST_NODE_TYPES.TSTypeParameterDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeParameterInstantiation:
                        return true;
                    // Only an ambient `declare module`/`declare namespace`/`declare global`
                    // is type-level; a plain `namespace Foo { ... }` body is runtime code.
                    case TSESTree.AST_NODE_TYPES.TSModuleDeclaration:
                        if (current.declare) {
                            return true;
                        }
                        break;
                    default:
                        break;
                }
                current = current.parent;
            }
            return false;
        }
    },
});
