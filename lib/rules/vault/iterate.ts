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

// `object.name`, written with a dot: a computed key such as `object[name]` is
// not followed.
function isNamed(node: TSESTree.MemberExpression, name: string): boolean {
    return (
        !node.computed &&
        node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.property.name === name
    );
}

// The name `{ path }` or `{ path: name }` binds the file's path to.
function getPathBinding(pattern: TSESTree.ObjectPattern): TSESTree.Identifier | undefined {
    for (const property of pattern.properties) {
        if (
            property.type === TSESTree.AST_NODE_TYPES.Property &&
            !property.computed &&
            property.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
            property.key.name === "path" &&
            property.value.type === TSESTree.AST_NODE_TYPES.Identifier
        ) {
            return property.value;
        }
    }
    return undefined;
}

function isWithin(node: TSESTree.Node, container: TSESTree.Node): boolean {
    return node.range[0] >= container.range[0] && node.range[1] <= container.range[1];
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
        // The path can also be read as `file?.path`, or destructured from the
        // parameter, as `path` in `({ path }) => path === value` or `p` in
        // `({ path: p }) => p === value`.
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
            if (!file) {
                return false;
            }
            const comparison = returnedExpression(predicate);
            if (
                comparison?.type !== TSESTree.AST_NODE_TYPES.BinaryExpression ||
                (comparison.operator !== "===" && comparison.operator !== "==")
            ) {
                return false;
            }
            // Every variable the parameter declares: the file, or what a
            // destructuring pattern takes from it.
            const variables = sourceCode
                .getDeclaredVariables(predicate)
                .filter((v) => v.defs.some((def) => isWithin(def.name, file)));
            let isFilePath: (node: TSESTree.Node) => boolean;
            if (file.type === TSESTree.AST_NODE_TYPES.Identifier) {
                const variable = variables.find((v) => v.defs.some((def) => def.name === file));
                if (!variable) {
                    return false;
                }
                const fileReferences = variable.references.map((ref) => ref.identifier);
                // `file.path`, or `file?.path`: the file is never null, so the
                // two read the same path.
                isFilePath = (node) => {
                    const member = node.type === TSESTree.AST_NODE_TYPES.ChainExpression ? node.expression : node;
                    return (
                        member.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                        isNamed(member, "path") &&
                        fileReferences.includes(member.object as TSESTree.Identifier)
                    );
                };
            } else if (file.type === TSESTree.AST_NODE_TYPES.ObjectPattern) {
                const binding = getPathBinding(file);
                const variable = binding && variables.find((v) => v.name === binding.name);
                if (!variable) {
                    return false;
                }
                isFilePath = (node) => variable.references.some((ref) => ref.identifier === node);
            } else {
                return false;
            }
            const references = variables.flatMap((v) => v.references.map((ref) => ref.identifier));
            const usesFile = (node: TSESTree.Node) =>
                references.some((ref) => isWithin(ref, node));
            const { left, right } = comparison;
            return (
                (isFilePath(left) && !usesFile(right)) ||
                (isFilePath(right) && !usesFile(left))
            );
        }

        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                if (
                    isNamed(node, "find") &&
                    node.object.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.object.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    isNamed(node.object.callee, "getFiles") &&
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
