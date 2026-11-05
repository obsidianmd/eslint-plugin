import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import { isResultDiscarded } from "../globalWindow.js";
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

        // `Object.assign({}, A, b)` for `Object.assign(A, b)`. Not where the
        // result is thrown away, as in `Object.assign(DEFAULTS, data);`: the
        // code then relies on A being changed, and the copy would do nothing.
        // Not with type arguments either, which are for two arguments.
        function suggestion(node: TSESTree.CallExpression): TSESLint.SuggestionReportDescriptor<"copyIntoNewObject">[] {
            if (isResultDiscarded(node) || isDiscardedChain(node) || node.typeArguments) {
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
                    node.arguments[1].type !== TSESTree.AST_NODE_TYPES.ObjectExpression
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
