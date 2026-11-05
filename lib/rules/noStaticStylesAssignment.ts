import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

// This rule will flag:
//
// - element.style.color = 'red' (or `red`, a template literal without expressions)
// - element.style.setProperty('color', 'red')
// - element.style.cssText = 'color: red;'
// - element.setAttribute('style', 'color: red;')
// - element.setCssProps({ color: 'red' }) and element.setCssStyles({ color }), any key
//   but a custom property (`--name`), whatever the value
//
// This rule will not flag:
//
// - element.style.width = myWidth; (assignment from a variable)
// - element.style.transform = `translateX(${offset}px)`; (assignment from a template literal with expressions)

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
// expressions, such as `red` in backquotes.
function isStaticValue(node: TSESTree.Node): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.Literal ||
        (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0)
    );
}

// The string a node spells out: a string literal or a template literal without
// expressions.
function getStaticString(node: TSESTree.Node): string | undefined {
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

// Whether `setCssProps()` or `setCssStyles()` is passed an object that sets a CSS
// property, rather than only custom properties (`--name`), whatever the values.
function setsCssProperty(argument: TSESTree.CallExpressionArgument | undefined): boolean {
    if (argument?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
        return false;
    }
    return argument.properties.some((property) => {
        if (property.type !== TSESTree.AST_NODE_TYPES.Property) {
            return false;
        }
        const name = getPropertyKeyName(property);
        return name !== undefined && !name.startsWith("--");
    });
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
                    isStyleMemberExpression(left.object)
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
                    isStyleMemberExpression(callee.object)
                ) {
                    // Check if the second argument is a literal
                    if (
                        node.arguments.length > 1 &&
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
                if (
                    (propertyName === "setCssProps" || propertyName === "setCssStyles") &&
                    setsCssProperty(node.arguments[0])
                ) {
                    context.report({
                        node,
                        messageId: "avoidStyleAssignment",
                        data: { property: `el.${propertyName}` },
                    });
                }
            },
        };
    },
});
