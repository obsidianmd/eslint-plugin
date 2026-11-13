import { TSESTree } from "@typescript-eslint/utils";

/**
 * Whether a member of a command object literal is the property `name`,
 * written as `name: …`, `"name": …` or `["name"]: …`. A computed key that is
 * not a string literal, such as `[name]: …`, is a variable and does not count.
 */
export function isCommandProperty(
    property: TSESTree.ObjectLiteralElement,
    name: string,
): property is TSESTree.Property {
    if (property.type !== TSESTree.AST_NODE_TYPES.Property) {
        return false;
    }
    const key = property.key;
    if (key.type === TSESTree.AST_NODE_TYPES.Literal) {
        return key.value === name;
    }
    return !property.computed && key.type === TSESTree.AST_NODE_TYPES.Identifier && key.name === name;
}

/**
 * Whether a call is a method call named addCommand, as `this.addCommand(…)`,
 * the call the command rules check.
 */
export function isAddCommandCall(node: TSESTree.CallExpression): boolean {
    return node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === "addCommand";
}

/**
 * The value of a string literal, or of a template literal without `${…}`.
 * Null for anything else.
 */
export function staticString(node: TSESTree.Node): string | null {
    if (node.type === TSESTree.AST_NODE_TYPES.Literal) {
        return typeof node.value === "string" ? node.value : null;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? null;
    }
    return null;
}

// The command's name, where it is a string written out, or null. The last
// `name` in the object is the one it has.
export function commandName(command: TSESTree.ObjectExpression): string | null {
    let name: string | null = null;
    for (const property of command.properties) {
        if (isCommandProperty(property, "name")) {
            name = staticString(property.value);
        } else if (property.type === TSESTree.AST_NODE_TYPES.SpreadElement) {
            name = null;
        }
    }
    return name;
}
