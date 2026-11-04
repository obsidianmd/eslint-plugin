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
            doNotAttachForbiddenElements: "Creating and attaching \"{{element}}\" elements is not allowed.",
            doNotAttachForbiddenStyleElements: "Creating and attaching \"{{element}}\" elements is not allowed. For loading CSS, use a \"styles.css\" file instead, which Obsidian loads for you.",
        },
    },
    defaultOptions: [],
    create(context) {
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
                if (element === "style" || element === "link") {
                    context.report({
                        node,
                        messageId: "doNotAttachForbiddenStyleElements",
                        data: {
                            element,
                        }
                    });
                } else if (element) {
                    context.report({
                        node,
                        messageId: "doNotAttachForbiddenElements",
                        data: {
                            element,
                        }
                    });
                }
            },
        };
    },
});

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
