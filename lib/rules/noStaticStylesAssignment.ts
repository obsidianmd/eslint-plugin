import { TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { getTypeInfo } from "../globalWindow.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

// This rule will flag:
//
// - element.style.color = 'red' (or `red`, a template literal without expressions)
// - element.style.setProperty('color', 'red')
// - element.style.cssText = 'color: red;'
// - element.setAttribute('style', 'color: red;')
// - element.setCssProps({ color: 'red' }) and element.setCssStyles({ color: 'red' }),
//   a CSS property that is not a custom property (`--name`) with a fixed value
//
// This rule will not flag:
//
// - settings.style.theme = "compact", where type information shows that
//   `settings.style` is not an element's style
// - element.style.width = myWidth; (assignment from a variable)
// - element.style.transform = `translateX(${offset}px)`; (assignment from a template literal with expressions)
// - element.setCssStyles({ top: `${y}px` }) (a value that is not fixed)
// - clearing a style: element.style.display = "", = null, setProperty("color", ""),
//   setCssStyles({ height: "" }), setAttribute("style", "")
// - custom properties: style.setProperty("--name", "1px"), setCssProps({ "--name": "1px" })

// Checks if a node is a MemberExpression accessing the 'style' property.
// e.g., `el.style` or `this.containerEl.style`
function isStyleMemberExpression(
    node: TSESTree.Node,
): node is TSESTree.MemberExpression {
    return (
        node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "style"
    );
}

// A value written out in the code: a literal, or a template literal without
// expressions, such as `red` in backquotes. An empty string and `null` clear an
// inline style rather than set one, which is what the rule asks for, so they
// are not fixed values.
function isStaticValue(node: TSESTree.Node): boolean {
    if (node.type === TSESTree.AST_NODE_TYPES.Literal) {
        if (node.raw === "null") {
            return false;
        }
        return !(typeof node.value === "string" && node.value.trim() === "");
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return (node.quasis[0].value.cooked ?? "").trim() !== "";
    }
    return false;
}

// The string a node spells out: a string literal or a template literal without
// expressions.
function getStaticString(node: TSESTree.Node | undefined): string | undefined {
    if (node === undefined) {
        return undefined;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.Literal && typeof node.value === "string") {
        return node.value;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return node.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
}

// The CSS property an object key names: `color`, `"color"`, `["color"]` or
// `` [`color`] ``. A computed key such as `[key]` names none that can be read.
function getPropertyKeyName(property: TSESTree.Property): string | undefined {
    if (!property.computed && property.key.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return property.key.name;
    }
    return getStaticString(property.key);
}

// The first property of the object passed to `setCssProps()` or `setCssStyles()`
// that sets a CSS property other than a custom property (`--name`) to a fixed
// value, if any. Computed values, such as `` top: `${y}px` ``, are what these
// functions are for.
function findStaticCssProperty(
    argument: TSESTree.CallExpressionArgument | undefined,
): TSESTree.Property | undefined {
    if (argument?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
        return undefined;
    }
    for (const property of argument.properties) {
        if (property.type !== TSESTree.AST_NODE_TYPES.Property) {
            continue;
        }
        const name = getPropertyKeyName(property);
        if (name !== undefined && !name.startsWith("--") && isStaticValue(property.value)) {
            return property;
        }
    }
    return undefined;
}

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow setting styles directly on DOM elements, favoring CSS classes instead.",
            url: docsUrl("no-static-styles-assignment"),
        },
        schema: [],
        messages: {
            avoidStyleAssignment:
                "Avoid setting styles directly via `{{property}}`. Use CSS classes for better theming and maintainability. Use the `setCssProps` function if the CSS properties need to change dynamically.",
        },
    },
    defaultOptions: [],
    create(context) {
        const types = getTypeInfo(context);

        // Whether the `style` object of `el.style` may be an element's
        // inline style. With type information, an object type that is
        // neither a `CSSStyleDeclaration` nor has its `cssText` or
        // `setProperty()` is something else, such as a plugin's own
        // `settings.style`. Without it, or where the type cannot tell
        // (`any`, an error type, a type parameter), it may be.
        function mayBeInlineStyle(style: TSESTree.MemberExpression): boolean {
            if (!types) {
                return true;
            }
            const type = types.checker.getNonNullableType(types.checker.getTypeAtLocation(types.toTs(style)));
            const parts = type.isUnion() ? type.types : [type];
            return parts.some((part) => {
                if ((part.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter | ts.TypeFlags.Never)) !== 0) {
                    return true;
                }
                if ((part.getSymbol() ?? part.aliasSymbol)?.getName() === "CSSStyleDeclaration") {
                    return true;
                }
                const apparent = types.checker.getApparentType(part);
                return (
                    apparent.getProperty("cssText") !== undefined ||
                    apparent.getProperty("setProperty") !== undefined ||
                    (part.aliasTypeArguments ?? []).some((argument) => argument.getSymbol()?.getName() === "CSSStyleDeclaration")
                );
            });
        }

        // How the message names `el.style.<property>`: `element.style.color` for
        // `el.style.color` and `el.style["color"]`, `element.style["--my-var"]`,
        // and `element.style[prop]` for a key that is not written out.
        function describeStyleProperty(left: TSESTree.MemberExpression): string {
            if (!left.computed) {
                return `element.style.${(left.property as TSESTree.Identifier).name}`;
            }
            const key = getStaticString(left.property);
            if (key === undefined) {
                return `element.style[${context.sourceCode.getText(left.property)}]`;
            }
            return /^[A-Za-z_$][\w$]*$/.test(key) ? `element.style.${key}` : `element.style[${JSON.stringify(key)}]`;
        }

        return {
            // Catches `el.style.color = 'red'` and `el.style.cssText = '...'`
            AssignmentExpression(node: TSESTree.AssignmentExpression) {
                const left = node.left;
                // We only care about static assignments (literals)
                if (!isStaticValue(node.right)) {
                    return;
                }

                if (
                    left.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    isStyleMemberExpression(left.object) &&
                    mayBeInlineStyle(left.object)
                ) {
                    context.report({
                        node,
                        messageId: "avoidStyleAssignment",
                        data: {
                            property: describeStyleProperty(left),
                        },
                    });
                }
            },

            // Catches `el.style.setProperty(...)` and `el.setAttribute('style', ...)`
            CallExpression(node: TSESTree.CallExpression) {
                const callee = node.callee;
                if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                const propertyName = (callee.property as TSESTree.Identifier)
                    .name;

                // Case 1: `el.style.setProperty('color', 'red')`
                if (
                    propertyName === "setProperty" &&
                    isStyleMemberExpression(callee.object) &&
                    mayBeInlineStyle(callee.object)
                ) {
                    // A fixed value for a CSS property; custom properties
                    // (`--name`) are allowed, as in `setCssProps()`. A call
                    // without arguments, such as `el.style.setProperty()`,
                    // sets nothing.
                    if (
                        node.arguments.length > 1 &&
                        !(getStaticString(node.arguments[0])?.startsWith("--") ?? false) &&
                        isStaticValue(node.arguments[1])
                    ) {
                        context.report({
                            node,
                            messageId: "avoidStyleAssignment",
                            data: { property: "element.style.setProperty" },
                        });
                    }
                }

                // Case 2: `el.setAttribute('style', '...')`
                if (propertyName === "setAttribute") {
                    if (
                        node.arguments.length > 1 &&
                        getStaticString(node.arguments[0]) === "style" &&
                        isStaticValue(node.arguments[1])
                    ) {
                        context.report({
                            node,
                            messageId: "avoidStyleAssignment",
                            data: { property: "element.setAttribute" },
                        });
                    }
                }

                // Case 3: `el.setCssProps({ 'color': 'blue' })` and `el.setCssProps({ color: 'blue' })`
                // Case 4: `el.setCssStyles({ 'color': 'blue' })` and `el.setCssStyles({ color: 'blue' })`
                if (propertyName === "setCssProps" || propertyName === "setCssStyles") {
                    const property = findStaticCssProperty(node.arguments[0]);
                    if (property === undefined) {
                        return;
                    }
                    context.report({
                        node: property,
                        messageId: "avoidStyleAssignment",
                        data: { property: `el.${propertyName}` },
                    });
                }
            },
        };
    },
});
