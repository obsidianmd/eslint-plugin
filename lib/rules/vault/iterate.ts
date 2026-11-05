import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { getTypeInfo } from "../../globalWindow.js";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../../minAppVersion.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

// The Obsidian version that added Vault.getFileByPath().
const GET_FILE_BY_PATH_SINCE = "1.5.7";

type MessageIds = "iterate" | "useGetFileByPath" | "useGetFileByPathSince";

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

export default ruleCreator<MinAppVersionOptions, MessageIds>({
    meta: {
        docs: {
            description:
                "Avoid iterating all files to find a file by its path",
            url: docsUrl("iterate", "vault"),
        },
        type: "problem" as const,
        messages: {
            iterate: "Avoid iterating all files to find a file by its path",
            useGetFileByPath:
                "Replace with `getFileByPath()`, which returns null, not undefined, when there is no such file.",
            useGetFileByPathSince:
                "Replace with `getFileByPath()`, which returns null, not undefined, when there is no such file (needs Obsidian {{since}} or later).",
        },
        hasSuggestions: true,
        schema: minAppVersionSchema,
    },
    defaultOptions: [{}],
    create: (context) => {
        const sourceCode = context.sourceCode;
        const supported = supportsVersion(context.options[0]?.minAppVersion, GET_FILE_BY_PATH_SINCE);
        const types = getTypeInfo(context);

        // Whether `predicate` only returns `file.path === value` or
        // `value === file.path` (or `==`), with `file` its parameter and a value
        // that does not depend on the file: the lookup getFileByPath() does.
        // The path can also be read as `file?.path`, or destructured from the
        // parameter, as `path` in `({ path }) => path === value` or `p` in
        // `({ path: p }) => p === value`.
        function findByPathValue(predicate: TSESTree.Node): TSESTree.Expression | null {
            if (
                (predicate.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                    predicate.type !== TSESTree.AST_NODE_TYPES.FunctionExpression) ||
                // Their result is an object, so find() returns the first file.
                predicate.async ||
                predicate.generator
            ) {
                return null;
            }
            // A `function`'s `this: …` parameter is a type annotation only.
            const file = predicate.params.find(
                (param) => !(param.type === TSESTree.AST_NODE_TYPES.Identifier && param.name === "this"),
            );
            if (!file) {
                return null;
            }
            const comparison = returnedExpression(predicate);
            if (
                comparison?.type !== TSESTree.AST_NODE_TYPES.BinaryExpression ||
                (comparison.operator !== "===" && comparison.operator !== "==")
            ) {
                return null;
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
                    return null;
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
                    return null;
                }
                isFilePath = (node) => variable.references.some((ref) => ref.identifier === node);
            } else {
                return null;
            }
            const references = variables.flatMap((v) => v.references.map((ref) => ref.identifier));
            const usesFile = (node: TSESTree.Node) =>
                references.some((ref) => isWithin(ref, node));
            const { left, right } = comparison;
            if (isFilePath(left) && !usesFile(right)) {
                return right;
            }
            return isFilePath(right) && !usesFile(left) ? left : null;
        }

        // `<vault>.getFileByPath(value)` for `<vault>.getFiles().find(…)`,
        // where the path is a value whose reading does nothing else, and
        // nothing relies on the result being undefined rather than null.
        function suggestion(
            find: TSESTree.CallExpression,
            getFiles: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
            value: TSESTree.Expression,
        ): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
            const predicate = find.arguments[0];
            if (
                supported === false ||
                // A thisArg, or an argument to getFiles(), would be dropped.
                find.arguments.length !== 1 ||
                getFiles.arguments.length > 0 ||
                !isPlainValue(value, predicate) ||
                !hasGetFileByPath(getFiles.callee.object, value) ||
                reliesOnUndefined(find)
            ) {
                return [];
            }
            const start = getFiles.callee.property.range[0];
            const kept = withParentheses(value);
            // Comments are kept only inside the value and its parentheses.
            const lost = sourceCode
                .getAllComments()
                .some(
                    (comment) =>
                        comment.range[0] >= start &&
                        comment.range[1] <= find.range[1] &&
                        !(comment.range[0] >= kept[0] && comment.range[1] <= kept[1]),
                );
            if (lost) {
                return [];
            }
            const fix = (fixer: TSESLint.RuleFixer) =>
                fixer.replaceTextRange([start, find.range[1]], `getFileByPath(${sourceCode.text.slice(kept[0], kept[1])})`);
            return [
                supported === undefined
                    ? { messageId: "useGetFileByPathSince", data: { since: GET_FILE_BY_PATH_SINCE }, fix }
                    : { messageId: "useGetFileByPath", fix },
            ];
        }

        // The range of `node` with the parentheses around it: an operand of the
        // comparison, so a `(` before it and a `)` after it are its own.
        function withParentheses(node: TSESTree.Node): [number, number] {
            let first: TSESTree.Node | TSESTree.Token = node;
            let last: TSESTree.Node | TSESTree.Token = node;
            for (;;) {
                const before: TSESTree.Token | null = sourceCode.getTokenBefore(first);
                const after: TSESTree.Token | null = sourceCode.getTokenAfter(last);
                if (before?.value !== "(" || after?.value !== ")") {
                    return [first.range[0], last.range[1]];
                }
                first = before;
                last = after;
            }
        }

        // Whether `node`, read once outside the predicate, gives the value it
        // gave inside it, doing nothing else: variables, literals, properties,
        // template literals and `+` of those. Not a call, an assignment, or a
        // name of the predicate's own, such as a `function`'s `this`,
        // `arguments` or its name.
        function isPlainValue(node: TSESTree.Node, predicate: TSESTree.Node): boolean {
            const ownsThis = predicate.type === TSESTree.AST_NODE_TYPES.FunctionExpression;
            const visit = (current: TSESTree.Node): boolean => {
                switch (current.type) {
                    case TSESTree.AST_NODE_TYPES.Identifier: {
                        const reference = sourceCode
                            .getScope(current)
                            .references.find((ref) => ref.identifier === current);
                        const scope = reference?.resolved?.scope;
                        if (scope && isWithin(scope.block, predicate)) {
                            return false;
                        }
                        return !(ownsThis && current.name === "arguments" && !reference?.resolved);
                    }
                    case TSESTree.AST_NODE_TYPES.Literal:
                        return true;
                    case TSESTree.AST_NODE_TYPES.ThisExpression:
                        return !ownsThis;
                    case TSESTree.AST_NODE_TYPES.MemberExpression:
                        return visit(current.object) && (!current.computed || visit(current.property));
                    case TSESTree.AST_NODE_TYPES.ChainExpression:
                    case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
                    case TSESTree.AST_NODE_TYPES.TSAsExpression:
                    case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
                    case TSESTree.AST_NODE_TYPES.TSTypeAssertion:
                        return visit(current.expression);
                    case TSESTree.AST_NODE_TYPES.TemplateLiteral:
                        return current.expressions.every(visit);
                    case TSESTree.AST_NODE_TYPES.BinaryExpression:
                        return current.operator === "+" && visit(current.left) && visit(current.right);
                    default:
                        return false;
                }
            };
            return visit(node);
        }

        // With type information, whether the vault has getFileByPath() and the
        // value is a string it takes. Without, or for a vault typed `any`, true.
        function hasGetFileByPath(vault: TSESTree.Expression, value: TSESTree.Expression): boolean {
            if (!types) {
                return true;
            }
            const vaultType = types.checker.getNonNullableType(types.checker.getTypeAtLocation(types.toTs(vault)));
            if (vaultType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
                return true;
            }
            if (!types.checker.getPropertyOfType(vaultType, "getFileByPath")) {
                return false;
            }
            const checker = types.checker;
            if (typeof checker.isTypeAssignableTo !== "function" || typeof checker.getStringType !== "function") {
                return true;
            }
            return checker.isTypeAssignableTo(checker.getTypeAtLocation(types.toTs(value)), checker.getStringType());
        }

        // Whether code relies on find() giving undefined for no file: compares
        // it with undefined, or, with type information, passes it where
        // undefined is accepted but null is not. For a variable it is kept
        // in, each read of it counts, and a `let` set again does too.
        function reliesOnUndefined(find: TSESTree.CallExpression): boolean {
            const result = find.parent.type === TSESTree.AST_NODE_TYPES.ChainExpression ? find.parent : find;
            if (isUndefinedSensitive(result)) {
                return true;
            }
            const declarator = result.parent;
            if (
                declarator.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== result ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier
            ) {
                return false;
            }
            if (!types && acceptsUndefinedOnly(declarator.id.typeAnnotation?.typeAnnotation)) {
                return true;
            }
            const [variable] = sourceCode.getDeclaredVariables(declarator);
            return (variable?.references ?? []).some((reference) =>
                reference.init
                    ? false
                    : reference.isWrite() || (reference.isRead() && isUndefinedSensitive(reference.identifier)),
            );
        }

        // Whether `node`'s value is compared with undefined, or, with type
        // information, goes where undefined is accepted and null is not.
        function isUndefinedSensitive(node: TSESTree.Node): boolean {
            const parent = node.parent;
            if (
                parent?.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
                (parent.operator === "===" || parent.operator === "!==") &&
                isUndefined(parent.left === node ? parent.right : parent.left)
            ) {
                return true;
            }
            if (
                parent?.type === TSESTree.AST_NODE_TYPES.UnaryExpression &&
                parent.operator === "typeof"
            ) {
                return true;
            }
            if (!types) {
                return false;
            }
            const checker = types.checker;
            if (typeof checker.isTypeAssignableTo !== "function" || typeof checker.getNullType !== "function") {
                return false;
            }
            const expected = checker.getContextualType(types.toTs(node) as ts.Expression);
            return (
                expected !== undefined &&
                checker.isTypeAssignableTo(checker.getUndefinedType(), expected) &&
                !checker.isTypeAssignableTo(checker.getNullType(), expected)
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
                    node.parent.arguments.length > 0
                ) {
                    const value = findByPathValue(node.parent.arguments[0]);
                    if (value) {
                        context.report({
                            node,
                            messageId: "iterate",
                            suggest: suggestion(
                                node.parent,
                                node.object as TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
                                value,
                            ),
                        });
                    }
                }
            },
        };
    },
});

function isUndefined(node: TSESTree.Node): boolean {
    return (
        (node.type === TSESTree.AST_NODE_TYPES.Identifier && node.name === "undefined") ||
        (node.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.operator === "void")
    );
}

// Whether a type annotation is a union with `undefined` but not `null`, as in
// `const file: TFile | undefined = …`.
function acceptsUndefinedOnly(annotation: TSESTree.TypeNode | undefined): boolean {
    if (annotation?.type !== TSESTree.AST_NODE_TYPES.TSUnionType) {
        return false;
    }
    const kinds = annotation.types.map((type) => type.type);
    return (
        kinds.includes(TSESTree.AST_NODE_TYPES.TSUndefinedKeyword) &&
        !kinds.includes(TSESTree.AST_NODE_TYPES.TSNullKeyword)
    );
}
