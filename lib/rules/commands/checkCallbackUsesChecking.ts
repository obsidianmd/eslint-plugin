import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const CHECK_CALLBACKS = new Set(["checkCallback", "editorCheckCallback"]);

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description: "Require `checkCallback` and `editorCheckCallback` to use their `checking` parameter.",
            url: docsUrl("check-callback-uses-checking", "commands"),
        },
        messages: {
            checking:
                "'{{name}}' never reads 'checking', so the command runs whenever Obsidian only asks whether it is available. Return early when 'checking' is true, or use '{{plainName}}' if the command is always available.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function readsFirstParameter(fn: FunctionNode): boolean {
            // `function () { if (arguments[0]) ... }` reads it without naming it.
            if (
                fn.type === TSESTree.AST_NODE_TYPES.FunctionExpression &&
                (context.sourceCode.getScope(fn).set.get("arguments")?.references.length ?? 0) > 0
            ) {
                return true;
            }
            const param = fn.params[0];
            if (param === undefined) {
                return false;
            }
            if (param.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return true;
            }
            const variable = context.sourceCode
                .getDeclaredVariables(fn)
                .find((v) => v.name === param.name);
            return variable === undefined || variable.references.length > 0;
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "addCommand" ||
                    node.arguments[0]?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
                ) {
                    return;
                }

                for (const property of node.arguments[0].properties) {
                    if (
                        property.type !== TSESTree.AST_NODE_TYPES.Property ||
                        property.key.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                        !CHECK_CALLBACKS.has(property.key.name)
                    ) {
                        continue;
                    }

                    const fn = property.value;
                    if (
                        fn.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
                        fn.type !== TSESTree.AST_NODE_TYPES.FunctionExpression
                    ) {
                        continue;
                    }

                    if (!readsFirstParameter(fn)) {
                        const name = property.key.name;
                        context.report({
                            node: property.key,
                            messageId: "checking",
                            data: {
                                name,
                                plainName: name === "checkCallback" ? "callback" : "editorCallback",
                            },
                        });
                    }
                }
            },
        };
    },
});
