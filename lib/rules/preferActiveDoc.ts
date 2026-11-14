import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { disableDirectives, isDisabled, problemStart } from "../disableDirectives.js";
import { getTypeInfo, hasLocalBinding, mayRunOutsideObsidianAt } from "../globalWindow.js";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../minAppVersion.js";
import { API_SINCE } from "../obsidianApiVersions.js";
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
const ACTIVE_DOCUMENT_SINCE = API_SINCE.activeDocument;

// The objects a property set on lives as long as the plugin: the global
// object, and a CommonJS module's exports.
const GLOBAL_OBJECTS = new Set(["window", "globalThis", "global", "self", "activeWindow", "module", "exports"]);
const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);
// The calls that attach a listener to their target: `target.addEventListener()`
// and its removal, and Obsidian's `registerDomEvent(target, …)`.
// `dispatchEvent` too: an event dispatched on a document reaches the listeners
// on that document, which stay on the main one.
const LISTENER_METHODS = new Set(["addEventListener", "removeEventListener", "dispatchEvent"]);
const REGISTER_DOM_EVENT = "registerDomEvent";
// The globals a listener can be registered on whose events come from the main
// window, so that `document` in the listener is that window's document.
const MAIN_WINDOW_TARGETS = new Set(["document", "window"]);
// The scopes whose variables live as long as the plugin: the module, the
// script, and a `namespace`.
const MODULE_SCOPES = new Set<string>(["module", "global", "tsModule"]);

// The elements of a document whose classes, attributes, style and children
// apply to the whole window.
const WINDOW_ELEMENTS = new Set(["body", "documentElement", "head"]);
// The methods that change such an element: its classes, attributes or style,
// or the elements in it.
const WINDOW_ELEMENT_MUTATORS = new Set([
    "addClass", "addClasses", "removeClass", "removeClasses", "toggleClass",
    "setAttribute", "removeAttribute", "toggleAttribute", "setAttr",
    "setCssProps", "setCssStyles",
    "appendChild", "append", "prepend", "insertBefore", "removeChild", "replaceChild", "replaceChildren",
    "insertAdjacentElement", "insertAdjacentHTML", "insertAdjacentText",
]);
// The calls that put an element in `body`, with the index of the argument that
// is the element, and the call that takes one out. An element the code both
// puts there and removes again, such as a download link or a textarea for
// copying text, is no state of the window: it belongs in the active window's
// body like any other use of `document`.
const CHILD_ADDERS: Record<string, number> = {
    appendChild: 0, append: 0, prepend: 0, insertBefore: 0, insertAdjacentElement: 1,
};
const CHILD_REMOVERS = new Set(["removeChild"]);
// Obsidian's helpers that create an element in `<head>`, such as a `<style>`.
const CREATE_METHODS = new Set(["createEl", "createDiv", "createSpan", "createSvg"]);
const CLASS_LIST_MUTATORS = new Set(["add", "remove", "toggle", "replace"]);
const STYLE_MUTATORS = new Set(["setProperty", "removeProperty"]);
// The calls that look an element up in a document, or in its body.
const LOOKUP_METHODS = new Set([
    "querySelector", "querySelectorAll", "getElementById", "getElementsByClassName", "find", "findAll",
]);
// The lookups of a single element, which code removes as `?.remove()`.
const SINGLE_LOOKUP_METHODS = new Set(["querySelector", "getElementById", "find"]);
const REMOVE_METHODS = new Set(["remove", "detach"]);
// The classes of Obsidian's UI that only the main window has: a popout
// window has a workspace (`app-container`, `mod-root`, its own `titlebar`),
// but no status bar, no ribbons and no side docks.
const MAIN_WINDOW_CLASS = /^(?:status-bar(?:-[\w-]+)?|workspace-ribbon|side-dock-[\w-]+|mod-(?:left|right)-split|mod-sidedock)$/;
const MAIN_WINDOW_CLASS_IN_SELECTOR =
    /\.(?:status-bar(?:-[\w-]+)?|workspace-ribbon|side-dock-[\w-]+|mod-(?:left|right)-split|mod-sidedock)(?![\w-])/;
// The globals `activeDocument` can be read from.
const GLOBAL_HOSTS = new Set(["window", "globalThis", "self"]);
// The document properties that hold a document, for `[document, win.document]`.
const DOCUMENT_PROPERTIES = new Set(["doc", "document", "ownerDocument", "activeDocument"]);

type MessageIds = "preferActive" | "preferActiveBody" | "perWindowState" | "useActiveDocument" | "useActiveDocumentSince" | "useIsConnected";

// Each scope's references by the identifier that makes them.
const referencesByScope = new WeakMap<object, Map<TSESTree.Node, TSESLint.Scope.Reference>>();
// Each function by whether it compares a document with the global `document`.
const comparesDocument = new WeakMap<TSESTree.Node, boolean>();

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
            preferActiveBody:
                "Use 'activeDocument.body' instead of 'document.body', so the element is put in the window that has focus, for popout window compatibility.",
            perWindowState:
                "'document.{{element}}' is the main window's, so this change does not reach popout windows. Make it, and undo it, in each window's document, for example from `workspace.on(\"window-open\")`.",
            useActiveDocument: "Replace with `activeDocument`, the document of the window that has focus.",
            useActiveDocumentSince:
                "Replace with `activeDocument`, the document of the window that has focus (needs Obsidian {{since}} or later).",
            useIsConnected:
                "Replace with `.isConnected` on the node, which is true when it is in its own window's document.",
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

                // Code that already handles popout windows, or UI only the
                // main window has: correct as written.
                if (isActiveDocumentFallback(node) || isListedWithOtherDocuments(node) || isMainWindowUiLookup(node)) {
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
                    // Below 0.15.0, which has no activeDocument, the call is
                    // left alone even where prefer-create-el's helper is too
                    // new: neither replacement can be used there.
                    isReportedOnGlobalDocument(node.parent.parent, supported === false ? null : context.options[0]?.minAppVersion) &&
                    !createElDisabledAt(node.parent.parent)
                ) {
                    return;
                }

                // `document.body.classList.add(…)` and the like: the change
                // has to reach each window, and be undone in each. With
                // `activeDocument`, a class added in one window could be
                // removed from another, so nothing is suggested.
                const windowElement = mutatedWindowElement(node);
                if (windowElement !== null) {
                    context.report({ node, messageId: "perWindowState", data: { element: windowElement }, suggest: [] });
                    return;
                }

                if (node.name === "document" && isTransientBodyUse(node)) {
                    context.report({ node, messageId: "preferActiveBody", suggest: transientBodySuggestions(node) });
                    return;
                }

                context.report({
                    node,
                    messageId: "preferActive",
                    data: {
                        original: node.name,
                        replacement,
                    },
                    suggest: suggestionsFor(node),
                });
            },
        };

        function suggestionsFor(node: TSESTree.Identifier): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
            const contains = containsCallOn(node);
            if (contains) {
                const isConnected = isConnectedSuggestion(contains);
                return isConnected ? [isConnected] : [];
            }
            if (isElementContainsCall(node) || isLookupToRemove(node) || isHandedOn(node) || isInFunctionComparingDocument(node)) {
                return [];
            }
            return offerable && canSuggestAt(node) ? [suggestion(node)] : [];
        }

        // Whether `node` is in a function that compares a document with the
        // global `document`, as in `if (newDoc !== document) { for (const cls
        // of document.body.classList) … }`: code that tells the main window
        // from the others, where `document` means the main window's.
        function isInFunctionComparingDocument(node: TSESTree.Identifier): boolean {
            let fn: TSESTree.Node | undefined = node.parent;
            while (
                fn &&
                fn.type !== TSESTree.AST_NODE_TYPES.FunctionDeclaration &&
                fn.type !== TSESTree.AST_NODE_TYPES.FunctionExpression &&
                fn.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression
            ) {
                fn = fn.parent;
            }
            if (!fn) {
                return false;
            }
            let compares = comparesDocument.get(fn);
            if (compares === undefined) {
                compares = context.sourceCode
                    .getScope(fn)
                    .through.some(
                        (reference) =>
                            reference.identifier.name === "document" &&
                            (reference.resolved?.defs.length ?? 0) === 0 &&
                            isComparison(reference.identifier),
                    );
                comparesDocument.set(fn, compares);
            }
            return compares;
        }

        // Whether `node`, under casts only, is an operand of `===`, `!==`,
        // `==` or `!=`.
        function isComparison(node: TSESTree.Node): boolean {
            const value = outerValue(node);
            return (
                value.parent?.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
                EQUALITY_OPERATORS.has(value.parent.operator)
            );
        }

        // The property read from `value`, as in `value.name`: the member
        // expression and the name. With `computed`, also `value[key]`.
        function propertyOf(
            value: TSESTree.Node,
            computed = false,
        ): { member: TSESTree.MemberExpression; name: string | null } | null {
            const parent = value.parent;
            if (parent?.type !== TSESTree.AST_NODE_TYPES.MemberExpression || parent.object !== value) {
                return null;
            }
            if (!parent.computed && parent.property.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return { member: parent, name: parent.property.name };
            }
            return computed ? { member: parent, name: null } : null;
        }

        function isCalled(member: TSESTree.MemberExpression): member is TSESTree.MemberExpression & { parent: TSESTree.CallExpression } {
            return member.parent.type === TSESTree.AST_NODE_TYPES.CallExpression && member.parent.callee === member;
        }

        // Whether `member` is written: assigned, updated or deleted.
        function isWritten(member: TSESTree.MemberExpression): boolean {
            const parent = member.parent;
            return (
                (parent.type === TSESTree.AST_NODE_TYPES.AssignmentExpression && parent.left === member) ||
                (parent.type === TSESTree.AST_NODE_TYPES.UpdateExpression && parent.argument === member) ||
                (parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "delete" && parent.argument === member)
            );
        }

        // The element, `body`, `documentElement` or `head`, whose state for
        // the whole window `document` changes there, if it does:
        // `document.body.classList.add(…)`, `document.body.toggleClass(…)`,
        // `document.documentElement.style.setProperty(…)`,
        // `document.body.style.color = …`, `document.head.appendChild(style)`.
        function mutatedWindowElement(node: TSESTree.Identifier): string | null {
            const element = propertyOf(outerValue(node));
            if (!element?.name || !WINDOW_ELEMENTS.has(element.name)) {
                return null;
            }
            const inner = propertyOf(element.member);
            if (!inner?.name) {
                return null;
            }
            let mutates = false;
            if (movesTransientElementIn(element.name, inner.member, inner.name)) {
                return null;
            }
            if (isCalled(inner.member)) {
                mutates =
                    WINDOW_ELEMENT_MUTATORS.has(inner.name) || (element.name === "head" && CREATE_METHODS.has(inner.name));
            } else if (isWritten(inner.member)) {
                mutates = true;
            } else {
                const last = propertyOf(inner.member, true);
                if (last) {
                    switch (inner.name) {
                        case "classList":
                            mutates = isCalled(last.member) && CLASS_LIST_MUTATORS.has(last.name ?? "");
                            break;
                        case "style":
                            mutates = isWritten(last.member) || (isCalled(last.member) && STYLE_MUTATORS.has(last.name ?? ""));
                            break;
                        case "dataset":
                            mutates = isWritten(last.member);
                            break;
                        default:
                            break;
                    }
                }
            }
            return mutates ? element.name : null;
        }

        // Whether `call`, `body.<method>(…)`, puts in or takes out an element
        // that the code both puts somewhere and removes again, as in
        // `document.body.appendChild(a); a.click(); a.remove();`.
        // Whether `node` is the `document` of `document.body.<method>(…)` that
        // puts in or takes out an element only there for a moment.
        function isTransientBodyUse(node: TSESTree.Identifier): boolean {
            const element = propertyOf(outerValue(node));
            const inner = element?.name === "body" ? propertyOf(element.member) : undefined;
            return !!inner?.name && movesTransientElementIn("body", inner.member, inner.name);
        }

        function movesTransientElementIn(element: string, member: TSESTree.MemberExpression, method: string): boolean {
            return element === "body" && isCalled(member) && movesTransientElement(member.parent, method);
        }

        // `document.body.contains(a)` counts too: it checks the body the
        // element was put in, so it has to move with the rest (see
        // transientBodySuggestions).
        function movesTransientElement(call: TSESTree.CallExpression, method: string): boolean {
            const variable = movedElementVariable(call, method);
            if (!variable) {
                return false;
            }
            let added = false;
            let removed = false;
            for (const reference of variable.references) {
                const id = reference.identifier;
                const parent = id.parent;
                if (!parent) {
                    continue;
                }
                // `a.remove()`, `a.detach()`
                if (
                    parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    parent.object === id &&
                    !parent.computed &&
                    parent.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    REMOVE_METHODS.has(parent.property.name) &&
                    isCalled(parent)
                ) {
                    removed = true;
                    continue;
                }
                // `x.appendChild(a)`, `x.removeChild(a)`
                if (
                    parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    parent.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    !parent.callee.computed &&
                    parent.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier
                ) {
                    const name = parent.callee.property.name;
                    if (Object.hasOwn(CHILD_ADDERS, name) && parent.arguments[CHILD_ADDERS[name]] === id) {
                        added = true;
                    } else if (CHILD_REMOVERS.has(name) && parent.arguments[0] === id) {
                        removed = true;
                    }
                }
            }
            return added && removed;
        }

        // The variable of the element `call`, `body.<method>(element)`, puts
        // in, takes out or looks for.
        function movedElementVariable(call: TSESTree.CallExpression, method: string): TSESLint.Scope.Variable | undefined {
            const index = Object.hasOwn(CHILD_ADDERS, method)
                ? CHILD_ADDERS[method]
                : CHILD_REMOVERS.has(method) || method === "contains"
                  ? 0
                  : undefined;
            const arg = index === undefined ? undefined : call.arguments[index];
            if (arg?.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return undefined;
            }
            let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(arg);
            let variable: TSESLint.Scope.Variable | undefined;
            for (; scope && !variable; scope = scope.upper) {
                variable = scope.set.get(arg.name);
            }
            return variable;
        }

        // The suggestion for an element only put in `document.body` for a
        // moment. The code that puts it there, takes it out and checks for it
        // has to use the same body: with `activeDocument.body` for the
        // `appendChild()` alone, `document.body.removeChild(el)` would throw
        // in a popout window, and `document.body.contains(el)` would be false.
        // So one suggestion rewrites the `document` of every
        // `document.body.<method>(el)` for the element, and is offered on each
        // of them, or on none where one of them cannot be rewritten.
        function transientBodySuggestions(node: TSESTree.Identifier): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
            const element = propertyOf(outerValue(node));
            const inner = element ? propertyOf(element.member) : undefined;
            const variable =
                inner?.name && isCalled(inner.member) ? movedElementVariable(inner.member.parent, inner.name) : undefined;
            if (!variable || !offerable) {
                return [];
            }
            const documents = new Set<TSESTree.Identifier>([node]);
            for (const reference of variable.references) {
                const id = reference.identifier;
                const call = id.parent;
                if (
                    id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    call?.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
                    !call.arguments.includes(id)
                ) {
                    continue;
                }
                const method = call.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression ? call.callee : null;
                const body = method && !method.computed ? skipCasts(method.object) : null;
                if (
                    body?.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    body.computed ||
                    body.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    body.property.name !== "body"
                ) {
                    continue;
                }
                const doc = skipCasts(body.object);
                if (
                    doc.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    doc.name === "document" &&
                    !findVariable(context.sourceCode.getScope(doc), "document")?.defs.length &&
                    method?.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    movedElementVariable(call, method.property.name) === variable
                ) {
                    documents.add(doc);
                }
            }
            const all = [...documents];
            if (all.some((doc) => !canSuggestAt(doc) || isHandedOn(doc) || isInFunctionComparingDocument(doc))) {
                return [];
            }
            return [suggestion(node, all)];
        }

        // `node` without the casts and `!` around it, as it is written inside them.
        function skipCasts(node: TSESTree.Node): TSESTree.Node {
            let current = node;
            while (
                current.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                current.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                current.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                current.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion
            ) {
                current = current.expression;
            }
            return current;
        }

        // Whether `document` finds an element there to remove it, as in
        // `document.getElementById("my-style")?.remove()`: what is removed
        // was put in the main window, and in a popout window
        // `activeDocument` would find nothing.
        function isLookupToRemove(node: TSESTree.Identifier): boolean {
            const lookup = lookupCallOf(node);
            if (!lookup || !SINGLE_LOOKUP_METHODS.has(lookup.method)) {
                return false;
            }
            const removal = propertyOf(lookup.call);
            return Boolean(removal?.name && REMOVE_METHODS.has(removal.name) && isCalled(removal.member));
        }

        // Whether `document.body` or `document.documentElement` checks there
        // whether it contains a node, as in `document.body.contains(el) &&
        // document.body.removeChild(el)`. `activeDocument` would check
        // another window than the one the node was put in.
        function isElementContainsCall(node: TSESTree.Identifier): boolean {
            const element = propertyOf(outerValue(node));
            if (element?.name !== "body" && element?.name !== "documentElement") {
                return false;
            }
            const contains = propertyOf(element.member);
            return contains?.name === "contains" && isCalled(contains.member);
        }

        // The lookup `document` makes there, if any: `document.querySelector(…)`,
        // `document.body.getElementsByClassName(…)`, `document.head.querySelector(…)`
        // and the like.
        function lookupCallOf(node: TSESTree.Identifier): { call: TSESTree.CallExpression; method: string } | null {
            let member = propertyOf(outerValue(node));
            if (member?.name && WINDOW_ELEMENTS.has(member.name)) {
                member = propertyOf(member.member);
            }
            if (!member?.name || !LOOKUP_METHODS.has(member.name) || !isCalled(member.member)) {
                return null;
            }
            return { call: member.member.parent, method: member.name };
        }

        // Whether `document` looks up UI that only the main window has, such as
        // `document.querySelector(".status-bar")` or
        // `document.getElementsByClassName("mod-left-split")[0]`. A popout
        // window has none, so `activeDocument` there would find nothing.
        function isMainWindowUiLookup(node: TSESTree.Identifier): boolean {
            const lookup = lookupCallOf(node);
            const argument = lookup?.call.arguments[0];
            let text: string | undefined;
            if (argument?.type === TSESTree.AST_NODE_TYPES.Literal && typeof argument.value === "string") {
                text = argument.value;
            } else if (argument?.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && argument.expressions.length === 0) {
                text = argument.quasis[0]?.value.cooked ?? undefined;
            }
            if (!lookup || text === undefined) {
                return false;
            }
            switch (lookup.method) {
                case "getElementsByClassName":
                    return text.split(/\s+/).some((name) => MAIN_WINDOW_CLASS.test(name));
                case "getElementById":
                    return false;
                default:
                    // Each selector of a list names such UI, outside a `:not()`.
                    return (
                        !text.includes(":not(") &&
                        text.split(",").every((selector) => MAIN_WINDOW_CLASS_IN_SELECTOR.test(selector))
                    );
            }
        }

        // Whether `node` is the global `activeDocument`, also read from the
        // global object (`window.activeDocument`), under casts.
        function isActiveDocument(node: TSESTree.Node | null | undefined): boolean {
            let value = node;
            while (
                value &&
                (value.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    value.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                    value.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                    value.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
                    value.type === TSESTree.AST_NODE_TYPES.ChainExpression)
            ) {
                value = value.expression;
            }
            if (value?.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return value.name === "activeDocument" && !hasLocalBinding(context.sourceCode.getScope(value), value.name);
            }
            if (
                value?.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !value.computed &&
                value.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                value.property.name === "activeDocument"
            ) {
                let object: TSESTree.Node = value.object;
                while (
                    object.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    object.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression
                ) {
                    object = object.expression;
                }
                return (
                    object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    GLOBAL_HOSTS.has(object.name) &&
                    !hasLocalBinding(context.sourceCode.getScope(object), object.name)
                );
            }
            return false;
        }

        // Whether `document` is the other choice to `activeDocument`, as in
        // `requireApiVersion("0.15.0") ? activeDocument : document` or
        // `activeDocument ?? document`: code for an Obsidian, or an
        // environment, without popout windows.
        function isActiveDocumentFallback(node: TSESTree.Identifier): boolean {
            const value = outerValue(node);
            const parent = value.parent;
            if (parent?.type === TSESTree.AST_NODE_TYPES.ConditionalExpression && parent.test !== value) {
                return isActiveDocument(parent.consequent === value ? parent.alternate : parent.consequent);
            }
            return (
                parent?.type === TSESTree.AST_NODE_TYPES.LogicalExpression &&
                (parent.operator === "??" || parent.operator === "||") &&
                parent.right === value &&
                isActiveDocument(parent.left)
            );
        }

        // Whether `document` is listed with other documents, as in
        // `[document, ...this.getPopoutDocuments()]` or
        // `new Set([document, activeDocument])`: code that goes over each
        // window's document, the main one among them.
        function isListedWithOtherDocuments(node: TSESTree.Identifier): boolean {
            const value = outerValue(node);
            const list = value.parent;
            if (list?.type !== TSESTree.AST_NODE_TYPES.ArrayExpression) {
                return false;
            }
            return list.elements.some((element) => {
                if (!element || element === value) {
                    return false;
                }
                if (element.type === TSESTree.AST_NODE_TYPES.SpreadElement || isActiveDocument(element)) {
                    return true;
                }
                let other: TSESTree.Node = element;
                while (other.type === TSESTree.AST_NODE_TYPES.TSAsExpression || other.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression) {
                    other = other.expression;
                }
                if (other.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                    other = other.expression;
                }
                return (
                    other.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    !other.computed &&
                    other.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    DOCUMENT_PROPERTIES.has(other.property.name)
                );
            });
        }

        // Whether the document itself is handed on as a value: an argument
        // (`this.registerDocument(document)`), an element of a list
        // (`new Set([document])`), a property's value (`{ doc: document }`),
        // assigned, a default (`doc: Document = document`), a field's value or
        // returned. The code that gets it may handle each window's document
        // on its own; `activeDocument` would hand on whichever had focus.
        function isHandedOn(node: TSESTree.Identifier): boolean {
            let value = outerValue(node);
            while (
                value.parent?.type === TSESTree.AST_NODE_TYPES.ConditionalExpression &&
                value.parent.test !== value
            ) {
                value = outerValue(value.parent);
            }
            const parent = value.parent;
            switch (parent?.type) {
                case TSESTree.AST_NODE_TYPES.CallExpression:
                case TSESTree.AST_NODE_TYPES.NewExpression:
                    return parent.arguments.includes(value as TSESTree.Expression);
                case TSESTree.AST_NODE_TYPES.ArrayExpression:
                case TSESTree.AST_NODE_TYPES.ReturnStatement:
                    return true;
                case TSESTree.AST_NODE_TYPES.Property:
                    return parent.value === value && parent.parent.type === TSESTree.AST_NODE_TYPES.ObjectExpression;
                case TSESTree.AST_NODE_TYPES.AssignmentExpression:
                case TSESTree.AST_NODE_TYPES.AssignmentPattern:
                    return parent.right === value;
                case TSESTree.AST_NODE_TYPES.PropertyDefinition:
                    return parent.value === value;
                case TSESTree.AST_NODE_TYPES.ArrowFunctionExpression:
                    return parent.body === value;
                default:
                    return false;
            }
        }

        // `document.contains(node)`, as a call, if `document` is checked there.
        function containsCallOn(node: TSESTree.Identifier): TSESTree.CallExpression | null {
            const member = propertyOf(outerValue(node));
            if (member?.name !== "contains" || !isCalled(member.member)) {
                return null;
            }
            return member.member.parent;
        }

        // `node.isConnected` for `document.contains(node)`: whether `node` is
        // in a document, its own window's. It is only offered where both are
        // the same check, but for that window: with type information, `node`
        // is a `Node` and never `null` or `undefined`; the call has one
        // argument and no comments. A node in a shadow root, which Obsidian
        // does not use, is connected but not contained.
        function isConnectedSuggestion(call: TSESTree.CallExpression): TSESLint.SuggestionReportDescriptor<MessageIds> | null {
            const argument = call.arguments[0];
            if (
                !types ||
                call.optional ||
                (call.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression && call.callee.optional) ||
                call.arguments.length !== 1 ||
                !argument ||
                argument.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
                context.sourceCode.getCommentsInside(call).length > 0
            ) {
                return null;
            }
            const tsNode = types.toTs(argument);
            const type = types.checker.getTypeAtLocation(tsNode);
            const parts = type.isUnion() ? type.types : [type];
            const loose = ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;
            if (parts.some((part) => (part.flags & loose) !== 0) || !types.checker.getPropertyOfType(type, "isConnected")) {
                return null;
            }
            const text = context.sourceCode.getText(argument);
            const simple =
                argument.type === TSESTree.AST_NODE_TYPES.Identifier ||
                argument.type === TSESTree.AST_NODE_TYPES.ThisExpression ||
                argument.type === TSESTree.AST_NODE_TYPES.MemberExpression ||
                argument.type === TSESTree.AST_NODE_TYPES.CallExpression ||
                argument.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression;
            return {
                messageId: "useIsConnected",
                fix: (fixer) => fixer.replaceText(call, `${simple ? text : `(${text})`}.isConnected`),
            };
        }

        function suggestion(
            node: TSESTree.Identifier,
            nodes: readonly TSESTree.Identifier[] = [node],
        ): TSESLint.SuggestionReportDescriptor<MessageIds> {
            // `{ document }` is handed on (isHandedOn), so it is never offered.
            const fix = (fixer: TSESLint.RuleFixer) => nodes.map((each) => fixer.replaceText(each, "activeDocument"));
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
