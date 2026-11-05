import { TSESTree } from "@typescript-eslint/utils";

/**
 * The name a class member's key spells out, or null when the syntax does not
 * give one: `name() {}` and `"name"() {}` as written, and `["name"]() {}` or
 * `` [`name`]() {} `` computed from a string. A computed key that is anything
 * else, such as `[name]() {}`, names whatever the expression holds, and a
 * private `#name` is not the member `name`.
 */
export function staticMemberName(member: TSESTree.ClassElement): string | null {
    if (!("key" in member)) {
        return null;
    }
    const key = member.key;
    if (key.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return member.computed ? null : key.name;
    }
    if (key.type === TSESTree.AST_NODE_TYPES.Literal) {
        return typeof key.value === "string" ? key.value : null;
    }
    if (member.computed && key.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && key.expressions.length === 0) {
        return key.quasis[0].value.cooked;
    }
    return null;
}
