import { ASTUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const { DefinitionType } = TSESLint.Scope;

// We want to catch patterns like:
//
// const styleSheet = document.createElement('link');
// styleSheet.rel = 'stylesheet';
// styleSheet.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);
// document.head.appendChild(styleSheet);
//
// or
//
// const style = document.createElement('style');
// style.textContent = `Some CSS here`;
// document.head.appendChild(style);

/**
 * Mapping from element tag name to expected type.
 */
const FORBIDDEN_ELEMENT_TYPES = ["link", "style"];

// The documents a plugin creates elements in: `document`, `activeDocument`, and
// a property access ending in `.document`, `.activeDocument`, `.doc` (Obsidian's
// Node#doc) or `.ownerDocument`, such as `window.document`, `activeWindow.document`
// or `el.doc`. An iframe's `contentDocument`, and its `contentWindow.document`, is
// not the plugin's own document, and a document held in a variable is not followed.
const DOCUMENT_NAMES = new Set(["document", "activeDocument"]);
const DOCUMENT_PROPERTIES = new Set(["document", "activeDocument", "doc", "ownerDocument"]);
// The properties of a window that are its document.
const WINDOW_DOCUMENT_PROPERTIES = new Set(["document", "activeDocument"]);
// The properties of a window or document that lead to another window.
const OTHER_WINDOW_PROPERTIES = new Set(["defaultView", "parent", "top", "opener", "frameElement", "ownerDocument"]);

// The expression inside `x!`, `x as T`, `x satisfies T` and `<T>x`, which only
// change its type.
function skipTypeAssertions(node: TSESTree.Node): TSESTree.Node {
    while (
        node.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
        node.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion
    ) {
        node = node.expression;
    }
    return node;
}

function isDocument(node: TSESTree.Node): boolean {
    node = skipTypeAssertions(node);
    if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return DOCUMENT_NAMES.has(node.name);
    }
    return (
        node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        DOCUMENT_PROPERTIES.has(node.property.name) &&
        !isFrameWindowDocument(node)
    );
}

// `iframe.contentWindow.document`, also with `!` or `?.`: the iframe's document.
function isFrameWindowDocument(node: TSESTree.MemberExpression): boolean {
    if (node.property.type !== TSESTree.AST_NODE_TYPES.Identifier || !WINDOW_DOCUMENT_PROPERTIES.has(node.property.name)) {
        return false;
    }
    const object = skipTypeAssertions(node.object);
    return object.type === TSESTree.AST_NODE_TYPES.MemberExpression && getMemberName(object) === "contentWindow";
}

function isForbiddenCreateElementCall(node: TSESTree.CallExpression): string | undefined {
    // we are looking for document.createElement(...) on any of the documents above
    if (!(
        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === "createElement" &&
        isDocument(node.callee.object)
    )) {
        return undefined;
    }

    if (node.arguments.length === 0) {
        return undefined;
    }
    return isArgumentForbiddenElement(node.arguments[0]);
}

function isForbiddenCreateElCall(node: TSESTree.CallExpression): string | undefined {
    // we are looking for foo.createEl(...), on any receiver: `containerEl`,
    // `this.containerEl`, `el!`, or the element a call returns, as in
    // `containerEl.createDiv().createEl(...)`

    if (!(
        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === "createEl"
    )) {
        return undefined;
    }

    if (node.arguments.length === 0) {
        return undefined;
    }
    return isArgumentForbiddenElement(node.arguments[0]);
}

// The tag name when it is written out: a string, or a template literal without
// expressions, as in `"style"` or `` `style` ``.
function getLiteralTagName(arg: TSESTree.CallExpressionArgument): string | undefined {
    const node = skipTypeAssertions(arg);
    if (node.type === TSESTree.AST_NODE_TYPES.Literal && typeof node.value === "string") {
        return node.value;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return node.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
}

function isArgumentForbiddenElement(arg: TSESTree.CallExpressionArgument): string | undefined {
    const literalTagName = getLiteralTagName(arg);
    if (literalTagName !== undefined) {
        const tagName = literalTagName.toLowerCase();
        for (const forbiddenTagName of FORBIDDEN_ELEMENT_TYPES) {
            if (tagName === forbiddenTagName) {
                return tagName;
            }
        }
    }

    return undefined;
}


export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow attachment of forbidden elements to the DOM in Obsidian plugins.",
            url: docsUrl("no-forbidden-elements"),
        },
        schema: [],
        messages: {
            doNotAttachForbiddenStyleElements: "Creating and attaching \"{{element}}\" elements is not allowed. For loading CSS, use a \"styles.css\" file instead, which Obsidian loads for you.",
        },
    },
    defaultOptions: [],
    create(context) {
        // With type information, the TypeScript type of an identifier: "shadow"
        // for a ShadowRoot, "other" for another known type, and undefined
        // where there is none, or the type is `any`, `unknown` or a type
        // parameter, which tell nothing.
        const program = context.sourceCode.parserServices?.program;
        const parserServices = context.sourceCode.parserServices;
        function typeKind(node: TSESTree.Identifier): "shadow" | "other" | undefined {
            if (!program || !parserServices?.esTreeNodeToTSNodeMap) {
                return undefined;
            }
            const checker = program.getTypeChecker();
            const type = checker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));
            const parts = type.isUnion() ? type.types : [type];
            let known = false;
            for (const part of parts) {
                const flags = part.getFlags();
                if (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) {
                    return undefined;
                }
                if (flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) {
                    continue;
                }
                const name = (part.aliasSymbol ?? part.getSymbol())?.getName();
                if (name === "ShadowRoot") {
                    return "shadow";
                }
                // What getRootNode() and similar return may be a shadow root.
                if (name !== undefined && SHADOW_ROOT_SUPERTYPES.has(name)) {
                    return undefined;
                }
                known = true;
            }
            return known ? "other" : undefined;
        }

        // Whether `node` is a shadow root, or an element created inside one:
        // `el.attachShadow(…)`, `el.shadowRoot`, a variable or parameter typed
        // `ShadowRoot`, a `const` holding any of these, or a `let` every write
        // of which is one, and `x.createEl(…)`/`createDiv()`/`createSpan()` on
        // one, as in `const head = shadowRoot.createEl("head")`. Only a
        // `shadowRoot` named by nothing else, such as a global or an untyped
        // parameter, counts by its name: `const shadowRoot = document.head`
        // is the document's head. styles.css does not reach into a shadow
        // root, so a `<style>` or `<link>` there is the only way to style it.
        function isInShadowRoot(node: TSESTree.Node, seen = new Set<TSESTree.Node>()): boolean {
            if (isShadowRootAssertion(node)) {
                return true;
            }
            node = skipTypeAssertions(node);
            if (node.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                return isInShadowRoot(node.expression, seen);
            }
            if (node.type === TSESTree.AST_NODE_TYPES.AssignmentExpression && node.operator === "=") {
                return isInShadowRoot(node.right, seen);
            }
            if (node.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                return getMemberName(node) === "shadowRoot";
            }
            if (node.type === TSESTree.AST_NODE_TYPES.CallExpression) {
                const callee = skipTypeAssertions(node.callee);
                if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return false;
                }
                const method = getMemberName(callee);
                if (method === "attachShadow") {
                    return true;
                }
                return (
                    (method === "createEl" || method === "createDiv" || method === "createSpan") &&
                    isInShadowRoot(callee.object, seen)
                );
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier || seen.has(node)) {
                return false;
            }
            seen.add(node);
            const kind = typeKind(node);
            if (kind === "shadow") {
                return true;
            }
            const byName = kind === undefined && node.name === "shadowRoot";
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
            if (variable === null) {
                return byName;
            }
            if (variable.defs.length !== 1) {
                return false;
            }
            const def = variable.defs[0];
            const annotation = (def.name as TSESTree.Identifier).typeAnnotation?.typeAnnotation;
            if (annotation !== undefined) {
                return (
                    annotation.type === TSESTree.AST_NODE_TYPES.TSTypeReference &&
                    annotation.typeName.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    annotation.typeName.name === "ShadowRoot"
                );
            }
            if (def.type !== DefinitionType.Variable || def.node.id !== def.name) {
                // A parameter, or a name destructured or imported.
                return byName;
            }
            const writes = variable.references.filter((reference) => reference.writeExpr);
            if (writes.length === 0) {
                return byName;
            }
            const holds = (value: TSESTree.Node) =>
                isInShadowRoot(value, seen) || (byName && !isInDocument(value));
            if (def.parent.kind === "const") {
                return def.node.init !== null && holds(def.node.init);
            }
            return writes.every((reference) => holds(reference.writeExpr!));
        }

        // Whether `node` is known to be the document or an element outside a
        // shadow root: `document.head`, `activeDocument.body`,
        // `document.querySelector(…)`, `document.createElement(…)`, or
        // `createEl(…)`/`createDiv()`/`createSpan()` on one of these.
        function isInDocument(node: TSESTree.Node): boolean {
            node = skipTypeAssertions(node);
            if (node.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                return isInDocument(node.expression);
            }
            if (isDocument(node)) {
                return true;
            }
            if (node.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                return isInDocument(node.object);
            }
            if (
                node.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression
            ) {
                return isInDocument(node.callee.object);
            }
            return false;
        }

        // Whether `node` is an iframe's document or an element in it:
        // `iframe.contentDocument`, `iframe.contentWindow.document`, a member
        // of either, such as `iframe.contentDocument.head`, what a method
        // called on one returns, such as `querySelector(…)` or `createEl(…)`,
        // and a `const` holding any of these. styles.css does not reach into
        // an iframe's document, so a `<style>` or `<link>` there is the only
        // way to style it. A window or document reached from it, such as its
        // `defaultView.parent.document`, is not followed.
        function isInFrameDocument(node: TSESTree.Node, seen = new Set<TSESTree.Node>()): boolean {
            node = skipTypeAssertions(node);
            if (node.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                return isInFrameDocument(node.expression, seen);
            }
            if (node.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                const name = getMemberName(node);
                if (name === "contentDocument" || isFrameWindowDocument(node)) {
                    return true;
                }
                if (name === undefined || OTHER_WINDOW_PROPERTIES.has(name) || WINDOW_DOCUMENT_PROPERTIES.has(name)) {
                    return false;
                }
                return isInFrameDocument(node.object, seen);
            }
            if (node.type === TSESTree.AST_NODE_TYPES.CallExpression) {
                const callee = skipTypeAssertions(node.callee);
                return callee.type === TSESTree.AST_NODE_TYPES.MemberExpression && isInFrameDocument(callee.object, seen);
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier || seen.has(node)) {
                return false;
            }
            seen.add(node);
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
            const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
            return (
                def?.type === DefinitionType.Variable &&
                def.node.id === def.name &&
                def.parent.kind === "const" &&
                def.node.init !== null &&
                isInFrameDocument(def.node.init, seen)
            );
        }

        // Whether a `<style>` or `<link>` in `node` stays out of the plugin's
        // document: a shadow root, an iframe's document, or an element in one.
        function isInOwnStyleScope(node: TSESTree.Node): boolean {
            return isInShadowRoot(node) || isInFrameDocument(node);
        }

        // The nodes the element `call` creates is inserted into: directly, as in
        // `shadowRoot.appendChild(document.createElement("style"))`, or through
        // a `const` holding it, by `appendChild()`, `append()`, `prepend()`,
        // `insertBefore()` or `insertAdjacentElement()`. Undefined where the
        // element is held otherwise, so where it goes is not known.
        function getInsertionTargets(call: TSESTree.CallExpression): TSESTree.Node[] | undefined {
            let node: TSESTree.Node = call;
            while (
                node.parent?.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                node.parent?.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                node.parent?.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
                node.parent?.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression
            ) {
                node = node.parent;
            }
            const insertion = getInsertionTarget(node);
            if (insertion !== undefined) {
                return [insertion];
            }
            const declarator = node.parent;
            if (
                declarator?.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== node ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                declarator.parent.kind !== "const"
            ) {
                return undefined;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(declarator), declarator.id);
            if (variable === null) {
                return undefined;
            }
            const targets: TSESTree.Node[] = [];
            for (const reference of variable.references) {
                const target = getInsertionTarget(reference.identifier);
                if (target !== undefined) {
                    targets.push(target);
                }
            }
            return targets;
        }

        // The node `element` is inserted into, when it is an argument of
        // `parent.appendChild()`, `append()`, `prepend()` or `insertBefore()`.
        function getInsertionTarget(element: TSESTree.Node): TSESTree.Node | undefined {
            const call = element.parent;
            if (
                call?.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
                !call.arguments.includes(element as TSESTree.CallExpressionArgument) ||
                call.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression
            ) {
                return undefined;
            }
            const method = getMemberName(call.callee);
            if (
                method === "insertBefore"
                    ? call.arguments[0] === element
                    : method === "insertAdjacentElement"
                      ? call.arguments[1] === element
                      : INSERTION_METHODS.has(method ?? "")
            ) {
                return call.callee.object;
            }
            return undefined;
        }

        // we are looking for Obsidian's global createEl(...), unless the file binds
        // its own createEl. An ambient declaration (`declare function createEl(...)`)
        // has no body, so the call still reaches the global.
        function isForbiddenGlobalCreateElCall(node: TSESTree.CallExpression): string | undefined {
            if (
                node.callee.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.name !== "createEl" ||
                node.arguments.length === 0
            ) {
                return undefined;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node.callee);
            if (variable !== null && variable.defs.some((def) => !isAmbient(def.node))) {
                return undefined;
            }
            return isArgumentForbiddenElement(node.arguments[0]);
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                const element =
                    isForbiddenCreateElementCall(node) ??
                    isForbiddenCreateElCall(node) ??
                    isForbiddenGlobalCreateElCall(node);
                // Both forbidden elements load CSS, so the message points to
                // styles.css.
                if (element) {
                    const receiver =
                        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                        !isForbiddenCreateElementCall(node)
                            ? node.callee.object
                            : undefined;
                    // Created in a shadow root or an iframe's document, it stays
                    // exempt unless it is moved out of it; created elsewhere, it
                    // is exempt when it is inserted, and only ever into one.
                    const targets = getInsertionTargets(node) ?? [];
                    const intoOwnScope = targets.every((target) => isInOwnStyleScope(target));
                    if (
                        intoOwnScope &&
                        ((receiver !== undefined && isInOwnStyleScope(receiver)) || targets.length > 0)
                    ) {
                        return;
                    }
                    context.report({
                        node,
                        messageId: "doNotAttachForbiddenStyleElements",
                        data: {
                            element,
                        }
                    });
                }
            },
        };
    },
});

const INSERTION_METHODS = new Set(["appendChild", "append", "prepend"]);

// The types a ShadowRoot is also: a value of one of them may be a shadow root.
const SHADOW_ROOT_SUPERTYPES = new Set(["Node", "DocumentFragment", "EventTarget"]);

// `x as ShadowRoot` or `<ShadowRoot>x`, as in `el.getRootNode() as ShadowRoot`.
function isShadowRootAssertion(node: TSESTree.Node): boolean {
    return (
        (node.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
            node.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion) &&
        node.typeAnnotation.type === TSESTree.AST_NODE_TYPES.TSTypeReference &&
        node.typeAnnotation.typeName.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.typeAnnotation.typeName.name === "ShadowRoot"
    );
}

function getMemberName(node: TSESTree.MemberExpression): string | undefined {
    if (!node.computed && node.property.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return node.property.name;
    }
    return node.property.type === TSESTree.AST_NODE_TYPES.Literal && typeof node.property.value === "string"
        ? node.property.value
        : undefined;
}

function isAmbient(node: TSESTree.Node): boolean {
    for (let current: TSESTree.Node | undefined = node; current; current = current.parent) {
        if (
            (current.type === TSESTree.AST_NODE_TYPES.TSDeclareFunction ||
                current.type === TSESTree.AST_NODE_TYPES.VariableDeclaration ||
                current.type === TSESTree.AST_NODE_TYPES.ClassDeclaration ||
                current.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration) &&
            current.declare
        ) {
            return true;
        }
    }
    return false;
}
