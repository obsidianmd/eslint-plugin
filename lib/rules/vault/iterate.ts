import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

// `vault`, or any non-computed member access ending in `.vault`:
// `this.app.vault`, `app.vault`, `plugin.app.vault`, `this.vault`.
function isVault(node: TSESTree.Node): boolean {
    if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return node.name === "vault";
    }
    return (
        node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === "vault"
    );
}

// What a predicate returns when that is all it does: an arrow function's
// expression body, or the argument of a body that is one `return` statement.
function returnedExpression(
    fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | null {
    if (fn.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
        return fn.body;
    }
    const [statement, ...rest] = fn.body.body;
    return rest.length === 0 && statement?.type === TSESTree.AST_NODE_TYPES.ReturnStatement
        ? statement.argument
        : null;
}

export default ruleCreator({
    meta: {
        docs: {
            description:
                "Avoid iterating all files to find a file by its path",
            url: docsUrl("iterate", "vault"),
        },
        type: "problem" as const,
        messages: {
            iterate: "Avoid iterating all files to find a file by its path",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        const sourceCode = context.sourceCode;

        // Whether `predicate` only returns `file.path === value` or
        // `value === file.path` (or `==`), with `file` its parameter and a value
        // that does not depend on the file: the lookup getFileByPath() does.
        function isFindByPath(predicate: TSESTree.Node): boolean {
            if (
                (predicate.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                    predicate.type !== TSESTree.AST_NODE_TYPES.FunctionExpression) ||
                // Their result is an object, so find() returns the first file.
                predicate.async ||
                predicate.generator
            ) {
                return false;
            }
            // A `function`'s `this: …` parameter is a type annotation only.
            const file = predicate.params.find(
                (param) => !(param.type === TSESTree.AST_NODE_TYPES.Identifier && param.name === "this"),
            );
            if (file?.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            const comparison = returnedExpression(predicate);
            if (
                comparison?.type !== TSESTree.AST_NODE_TYPES.BinaryExpression ||
                (comparison.operator !== "===" && comparison.operator !== "==")
            ) {
                return false;
            }
            const variable = sourceCode
                .getDeclaredVariables(predicate)
                .find((v) => v.defs.some((def) => def.name === file));
            if (!variable) {
                return false;
            }
            const references = variable.references.map((ref) => ref.identifier);
            const isFilePath = (node: TSESTree.Node) =>
                node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !node.computed &&
                !node.optional &&
                node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                node.property.name === "path" &&
                references.includes(node.object as TSESTree.Identifier);
            const usesFile = (node: TSESTree.Node) =>
                references.some(
                    (ref) => ref.range[0] >= node.range[0] && ref.range[1] <= node.range[1],
                );
            const { left, right } = comparison;
            return (
                (isFilePath(left) && !usesFile(right)) ||
                (isFilePath(right) && !usesFile(left))
            );
        }

        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                if (
                    node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.property.name === "find" &&
                    node.object.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.object.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.object.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.object.callee.property.name === "getFiles" &&
                    isVault(node.object.callee.object) &&
                    node.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.parent.callee === node &&
                    node.parent.arguments.length > 0 &&
                    isFindByPath(node.parent.arguments[0])
                ) {
                    context.report({
                        node,
                        messageId: "iterate",
                    });
                }
            },
        };
    },
});
