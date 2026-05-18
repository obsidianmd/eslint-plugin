import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_GLOBALS = new Set(["global", "globalThis"]);

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow `global` and `globalThis`. Use `window` or `activeWindow` for popout window compatibility.",
            url: docsUrl("no-global-this"),
        },
        schema: [],
        fixable: "code" as const,
        messages: {
            avoidGlobal:
                "Avoid using '{{name}}'. Use 'window' or 'activeWindow' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            Identifier(node: TSESTree.Identifier) {
                if (!BANNED_GLOBALS.has(node.name)) {
                    return;
                }

                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression && node.parent.property === node) ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.Property && node.parent.key === node) ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator && node.parent.id === node) ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration)
                ) {
                    return;
                }

                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                context.report({
                    node,
                    messageId: "avoidGlobal",
                    data: { name: node.name },
                    fix(fixer) {
                        return fixer.replaceText(node, "window");
                    },
                });
            },
        };

        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                const variable = current.variables.find((v) => v.name === name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
