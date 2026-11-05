import { ASTUtils, TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

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
// or `el.doc`. An iframe's `contentDocument` is not the plugin's own document, and
// a document held in a variable is not followed.
const DOCUMENT_NAMES = new Set(["document", "activeDocument"]);
const DOCUMENT_PROPERTIES = new Set(["document", "activeDocument", "doc", "ownerDocument"]);

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
        DOCUMENT_PROPERTIES.has(node.property.name)
    );
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
        // Whether `node` is a shadow root, or an element created inside one:
        // `el.attachShadow(…)`, `el.shadowRoot`, a `shadowRoot` variable or
        // parameter, one typed `ShadowRoot`, a `const` holding any of these,
        // and `x.createEl(…)`/`createDiv()`/`createSpan()` on one, as in
        // `const head = shadowRoot.createEl("head")`. styles.css does not reach
        // into a shadow root, so a `<style>` or `<link>` there is the only way
        // to style it.
        function isInShadowRoot(node: TSESTree.Node, seen = new Set<TSESTree.Node>()): boolean {
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
            if (node.name === "shadowRoot") {
                return true;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
            if (variable?.defs.length !== 1) {
                return false;
            }
            const def = variable.defs[0];
            const annotation = (def.name as TSESTree.Identifier).typeAnnotation?.typeAnnotation;
            if (
                annotation?.type === TSESTree.AST_NODE_TYPES.TSTypeReference &&
                annotation.typeName.type === TSESTree.AST_NODE_TYPES.Identifier &&
                annotation.typeName.name === "ShadowRoot"
            ) {
                return true;
            }
            return (
                def.type === "Variable" &&
                def.parent.kind === "const" &&
                def.node.id === def.name &&
                def.node.init !== null &&
                isInShadowRoot(def.node.init, seen)
            );
        }

        // Whether the element `call` creates is only ever inserted into a
        // shadow root: `shadowRoot.appendChild(document.createElement("style"))`,
        // or a `const` holding it that every `appendChild()`, `append()`,
        // `prepend()` or `insertBefore()` call passes to a shadow root. An
        // element that is never inserted in the file is still reported.
        function isInsertedOnlyIntoShadowRoot(call: TSESTree.CallExpression): boolean {
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
                return isInShadowRoot(insertion);
            }
            const declarator = node.parent;
            if (
                declarator?.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== node ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                declarator.parent.kind !== "const"
            ) {
                return false;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(declarator), declarator.id);
            if (variable === null) {
                return false;
            }
            let inserted = false;
            for (const reference of variable.references) {
                const target = getInsertionTarget(reference.identifier);
                if (target === undefined) {
                    continue;
                }
                if (!isInShadowRoot(target)) {
                    return false;
                }
                inserted = true;
            }
            return inserted;
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
            if (method === "insertBefore" ? call.arguments[0] === element : INSERTION_METHODS.has(method ?? "")) {
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
                    if (
                        (receiver !== undefined && isInShadowRoot(receiver)) ||
                        isInsertedOnlyIntoShadowRoot(node)
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
