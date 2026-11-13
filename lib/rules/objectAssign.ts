import { ASTUtils, type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { getTypeInfo, isDiscardedArrowBody, isResultDiscarded } from "../globalWindow.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

// Properties whose name contains "default" but that are not a set of
// defaults: a module's default export, and the window of a document.
const NOT_DEFAULTS = new Set(["default", "defaultView"]);

// The name of an `Object.assign()` target that is a variable or a property:
// `DEFAULT_SETTINGS`, `this.defaults`, `Constants["DEFAULT_SETTINGS"]`.
function targetName(target: TSESTree.Node): string | null {
    if (target.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return target.name;
    }
    if (target.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
        return null;
    }
    const property = target.property;
    if (!target.computed) {
        return property.type === TSESTree.AST_NODE_TYPES.Identifier ||
            property.type === TSESTree.AST_NODE_TYPES.PrivateIdentifier
            ? property.name
            : null;
    }
    return property.type === TSESTree.AST_NODE_TYPES.Literal && typeof property.value === "string"
        ? property.value
        : null;
}

const FUNCTION_NODES = new Set<TSESTree.Node["type"]>([
    TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
    TSESTree.AST_NODE_TYPES.FunctionDeclaration,
    TSESTree.AST_NODE_TYPES.FunctionExpression,
]);

function isDefaultsName(name: string | null): boolean {
    return name !== null && !NOT_DEFAULTS.has(name) && name.toLowerCase().includes("default");
}

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description: "Discourage using `Object.assign` with two arguments",
            url: docsUrl("object-assign"),
        },
        schema: [],
        hasSuggestions: true,
        messages: {
            twoArgumentsDefault: "Using `Object.assign` with an non-empty target object can lead to unexpected behaviour as it will overwrite the  target object.",
            copyIntoNewObject: "Copy into a new object with `Object.assign({}, …)`, so that `{{target}}` is no longer changed.",
        },
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.sourceCode;
        const types = getTypeInfo(context);

        // `const defaults = new this.OptionsClass(); return Object.assign(defaults, options);`:
        // a variable of the same function that holds an object made there,
        // by `new`, a literal or `structuredClone()`, is filled in with the
        // call, not shared, so changing it is the point. Not for any other
        // call, which may return the shared defaults.
        function isFreshLocalObject(target: TSESTree.Node): boolean {
            if (target.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            const scope = sourceCode.getScope(target);
            const variable = ASTUtils.findVariable(scope, target);
            const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
            if (
                !variable ||
                def?.node.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                def.node.id !== def.name ||
                !FUNCTION_NODES.has(variable.scope.variableScope.block.type) ||
                variable.scope.variableScope !== scope.variableScope
            ) {
                return false;
            }
            const init = def.node.init;
            return (
                init?.type === TSESTree.AST_NODE_TYPES.NewExpression ||
                init?.type === TSESTree.AST_NODE_TYPES.ObjectExpression ||
                init?.type === TSESTree.AST_NODE_TYPES.ArrayExpression ||
                (init?.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    init.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    init.callee.name === "structuredClone")
            );
        }

        // Whether, by type, the target is an instance of a class: copying it
        // into `{}` would lose its prototype, so its methods, getters and
        // `instanceof`.
        function isClassInstance(target: TSESTree.Node): boolean {
            if (!types) {
                return false;
            }
            const type = types.checker.getNonNullableType(types.checker.getTypeAtLocation(types.toTs(target)));
            const parts = type.isUnionOrIntersection() ? type.types : [type];
            return parts.some((part) => ((part.getSymbol()?.flags ?? 0) & ts.SymbolFlags.Class) !== 0);
        }

        // `Object.assign({}, A, b)` for `Object.assign(A, b)`. Not where the
        // result is thrown away, as in `Object.assign(DEFAULTS, data);`: the
        // code then relies on A being changed, and the copy would do nothing.
        // Not with type arguments either, which are for two arguments.
        function suggestion(node: TSESTree.CallExpression): TSESLint.SuggestionReportDescriptor<"copyIntoNewObject">[] {
            if (
                isResultDiscarded(node) ||
                isDiscardedChain(node) ||
                isDiscardedArrowBody(node, types) ||
                node.typeArguments ||
                isClassInstance(node.arguments[0])
            ) {
                return [];
            }
            const open = sourceCode.getTokenAfter(node.callee, { filter: (token) => token.value === "(" });
            const first = open && sourceCode.getTokenAfter(open);
            if (!first) {
                return [];
            }
            return [{
                messageId: "copyIntoNewObject",
                data: { target: sourceCode.getText(node.arguments[0]) },
                fix: (fixer) => fixer.insertTextBefore(first, "{}, "),
            }];
        }

        // `Object.assign?.(A, b);`, whose result a chain holds.
        function isDiscardedChain(node: TSESTree.CallExpression): boolean {
            return node.parent.type === TSESTree.AST_NODE_TYPES.ChainExpression && isResultDiscarded(node.parent);
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee &&
                    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.callee.object &&
                    node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.object.name === "Object" &&
                    node.callee.property &&
                    node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.callee.property.name === "assign" &&
                    node.arguments.length === 2 &&
                    isDefaultsName(targetName(node.arguments[0])) &&
                    node.arguments[1].type !== TSESTree.AST_NODE_TYPES.ObjectExpression &&
                    !isFreshLocalObject(node.arguments[0])
                ) {
                    context.report({
                        node,
                        messageId: "twoArgumentsDefault",
                        suggest: suggestion(node),
                    });
                }
            },
        };
    },
});
