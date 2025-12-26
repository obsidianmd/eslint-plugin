import {
    ESLintUtils,
    ParserServices,
    TSESTree,
} from "@typescript-eslint/utils";
import type ts from "typescript";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// Check if a type is a subclass of a given class name.
function isSubclassOf(
    type: ts.Type,
    className: string,
    services: ParserServices,
): boolean {
    const constraint = type.getConstraint();
    if (constraint) {
        type = constraint;
    }
    const symbol = type.getSymbol();
    if (symbol?.name === className) {
        return true;
    }
    const baseTypes = type.getBaseTypes();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (isSubclassOf(baseType, className, services)) {
                return true;
            }
        }
    }
    return false;
}

export default ruleCreator({
    name: "no-view-references-in-plugin",
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow storing references to custom views directly in the plugin, which can cause memory leaks.",
        },
        schema: [],
        messages: {
            avoidViewReference:
                "Do not assign a view instance to a plugin property within `registerView`. This can cause memory leaks. Create and return the view directly.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const sourceCode = context.sourceCode;

        // Checks if an expression is `this` or an alias initialized with `this`.
        const isThisOrThisAlias = (node: TSESTree.Node): boolean => {
            if (node.type === TSESTree.AST_NODE_TYPES.ThisExpression) {
                return true;
            }
            if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
                const scope = sourceCode.getScope(node);
                const reference = scope.references.find(
                    (ref) => ref.identifier === node,
                );
                const variable = reference?.resolved;

                if (!variable?.defs[0]) {
                    return false;
                }

                const defNode = variable.defs[0].node;

                // Add a type guard to ensure the definition node is a
                // VariableDeclarator before accessing its `init` property.
                if (
                    defNode.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    defNode.init?.type === TSESTree.AST_NODE_TYPES.ThisExpression
                ) {
                    return true;
                }
            }
            return false;
        };

        const checkForBadAssignment = (
            node: TSESTree.Node | null | undefined,
        ) => {
            if (
                node?.type === TSESTree.AST_NODE_TYPES.AssignmentExpression &&
                node.left.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                isThisOrThisAlias(node.left.object) &&
                node.right.type === TSESTree.AST_NODE_TYPES.NewExpression
            ) {
                const newInstanceType = services.getTypeAtLocation(node.right);
                if (isSubclassOf(newInstanceType, "View", services)) {
                    context.report({
                        node: node,
                        messageId: "avoidViewReference",
                    });
                }
            }
        };

        return {
            "CallExpression[callee.property.name='registerView']"(
                callNode: TSESTree.CallExpression,
            ) {
                const callee = callNode.callee;
                if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;

                const callerType = services.getTypeAtLocation(callee.object);
                if (!isSubclassOf(callerType, "Plugin", services)) return;

                const factory = callNode.arguments[1];
                if (
                    !factory ||
                    (factory.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                        factory.type !== TSESTree.AST_NODE_TYPES.FunctionExpression)
                ) {
                    return;
                }

                const factoryBody = factory.body;

                if (factoryBody.type === TSESTree.AST_NODE_TYPES.AssignmentExpression) {
                    checkForBadAssignment(factoryBody);
                } else if (factoryBody.type === TSESTree.AST_NODE_TYPES.BlockStatement) {
                    for (const statement of factoryBody.body) {
                        if (statement.type === TSESTree.AST_NODE_TYPES.ExpressionStatement) {
                            checkForBadAssignment(statement.expression);
                        } else if (statement.type === TSESTree.AST_NODE_TYPES.ReturnStatement) {
                            checkForBadAssignment(statement.argument);
                        }
                    }
                }
            },
        };
    },
});
