import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_PROPERTIES = new Set(["userAgent", "platform"]);

// `x.name`, `x["name"]` or `` x[`name`] ``. A computed key such as `x[key]`
// names none that can be read.
function getPropertyName(node: TSESTree.MemberExpression): string | undefined {
    const property = node.property;
    if (!node.computed) {
        return property.type === TSESTree.AST_NODE_TYPES.Identifier ? property.name : undefined;
    }
    if (property.type === TSESTree.AST_NODE_TYPES.Literal && typeof property.value === "string") {
        return property.value;
    }
    if (property.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
        return property.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
}

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description: "Disallow use of navigator API for OS detection",
            url: docsUrl("platform"),
        },
        schema: [],
        messages: {
            avoidNavigator:
                "Avoid using the navigator API to detect the operating system. Use the Platform API instead.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                const propertyName = getPropertyName(node);
                if (propertyName === undefined || !BANNED_PROPERTIES.has(propertyName)) {
                    return;
                }

                const object = node.object;

                // Case 1: `navigator.userAgent` or `navigator.platform`
                if (
                    object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    object.name === "navigator"
                ) {
                    context.report({
                        node,
                        messageId: "avoidNavigator",
                    });
                    return;
                }

                // Case 2: `window.navigator.userAgent` or `window.navigator.platform`
                if (
                    object.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    object.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    object.object.name === "window" &&
                    getPropertyName(object) === "navigator"
                ) {
                    context.report({
                        node,
                        messageId: "avoidNavigator",
                    });
                }
            },
        };
    },
});
