import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

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
            description:
                "Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.",
            url: docsUrl("prefer-get-language"),
        },
        schema: [],
        messages: {
            localStorageLanguage:
                "Use Obsidian's 'getLanguage()' instead of 'localStorage.getItem(\"language\")' to detect the user's language.",
            i18nextDetector:
                "Use Obsidian's 'getLanguage()' instead of 'i18next-browser-languagedetector' to detect the user's language.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (!isLocalStorageGetItemLanguage(node)) {
                    return;
                }

                context.report({
                    node,
                    messageId: "localStorageLanguage",
                });
            },

            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                if (node.source.value === "i18next-browser-languagedetector") {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },

            // Also catch require('i18next-browser-languagedetector')
            'CallExpression[callee.name="require"]'(node: TSESTree.CallExpression) {
                const firstArg = node.arguments[0];
                if (
                    firstArg &&
                    firstArg.type === TSESTree.AST_NODE_TYPES.Literal &&
                    firstArg.value === "i18next-browser-languagedetector"
                ) {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },
        };

        function isLocalStorageGetItemLanguage(node: TSESTree.CallExpression): boolean {
            const callee = node.callee;
            if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return false;
            }

            // Check .getItem('language')
            if (getPropertyName(callee) !== "getItem") {
                return false;
            }

            const firstArg = node.arguments[0];
            if (
                !firstArg ||
                firstArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                firstArg.value !== "language"
            ) {
                return false;
            }

            // Check localStorage (direct or via variable)
            const obj = callee.object;
            if (obj.type === TSESTree.AST_NODE_TYPES.Identifier && obj.name === "localStorage") {
                return true;
            }

            // window.localStorage.getItem('language')
            if (
                obj.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                getPropertyName(obj) === "localStorage"
            ) {
                return true;
            }

            return false;
        }
    },
});
