import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

/**
 * Check if a type could be an object (not a primitive).
 * Returns true if the type includes any non-primitive types.
 */
function couldBeObject(type: ts.Type, checker: ts.TypeChecker): boolean {
    // Check for any/unknown - these could be objects
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
        return true;
    }

    // Check for the 'object' keyword type (NonPrimitive)
    if (type.flags & ts.TypeFlags.NonPrimitive) {
        return true;
    }

    // Check for object type (interfaces, classes, etc.)
    if (type.flags & ts.TypeFlags.Object) {
        // But allow arrays since they have reasonable toString
        const symbol = type.getSymbol();
        if (symbol?.name === "Array") {
            return false;
        }
        return true;
    }

    // Check union types - if any part could be an object, flag it
    if (type.isUnion()) {
        return type.types.some((t) => couldBeObject(t, checker));
    }

    // Primitives are fine
    if (
        type.flags &
        (ts.TypeFlags.String |
            ts.TypeFlags.Number |
            ts.TypeFlags.Boolean |
            ts.TypeFlags.BigInt |
            ts.TypeFlags.Null |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.StringLiteral |
            ts.TypeFlags.NumberLiteral |
            ts.TypeFlags.BooleanLiteral |
            ts.TypeFlags.BigIntLiteral)
    ) {
        return false;
    }

    return false;
}

export default ruleCreator({
    name: "no-object-to-string",
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Prevent calling toString() or using string coercion on values that might be objects, which produces '[object Object]'.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        schema: [],
        messages: {
            objectToString:
                "Calling toString() on a value that could be an object will produce '[object Object]'. Add a type guard to ensure the value is a primitive (string, number, boolean) first.",
            objectInSetText:
                "Passing a value that could be an object to setText() may produce '[object Object]'. Add a type guard to ensure the value is a string or number first.",
            objectInTemplate:
                "Using a value that could be an object in a template literal may produce '[object Object]'. Add a type guard to ensure the value is a primitive first.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            // Detect .toString() calls on potentially object types
            "CallExpression[callee.property.name='toString']"(
                node: TSESTree.CallExpression,
            ) {
                if (node.callee.type !== "MemberExpression") return;

                const objectType = services.getTypeAtLocation(
                    node.callee.object,
                );

                if (couldBeObject(objectType, checker)) {
                    context.report({
                        node,
                        messageId: "objectToString",
                    });
                }
            },

            // Detect setText() calls with potentially object arguments
            "CallExpression[callee.property.name='setText']"(
                node: TSESTree.CallExpression,
            ) {
                if (node.arguments.length === 0) return;

                const arg = node.arguments[0];
                const argType = services.getTypeAtLocation(arg);

                if (couldBeObject(argType, checker)) {
                    context.report({
                        node: arg,
                        messageId: "objectInSetText",
                    });
                }
            },

            // Detect template literals with potentially object expressions
            TemplateLiteral(node: TSESTree.TemplateLiteral) {
                for (const expression of node.expressions) {
                    const exprType = services.getTypeAtLocation(expression);

                    if (couldBeObject(exprType, checker)) {
                        context.report({
                            node: expression,
                            messageId: "objectInTemplate",
                        });
                    }
                }
            },
        };
    },
});
