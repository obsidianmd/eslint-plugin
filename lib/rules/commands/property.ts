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
