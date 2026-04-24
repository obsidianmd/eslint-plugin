import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
export default ruleCreator({
    name: "prefer-get-language",
    meta: {
        type: "problem",
        docs: {
            description: "Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.",
        },
        schema: [],
        messages: {
            localStorageLanguage: "Use Obsidian's 'getLanguage()' instead of 'localStorage.getItem(\"language\")' to detect the user's language.",
            i18nextDetector: "Use Obsidian's 'getLanguage()' instead of 'i18next-browser-languagedetector' to detect the user's language.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (!isLocalStorageGetItemLanguage(node)) {
                    return;
                }
                context.report({
                    node,
                    messageId: "localStorageLanguage",
                });
            },
            ImportDeclaration(node) {
                if (node.source.value === "i18next-browser-languagedetector") {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },
            // Also catch require('i18next-browser-languagedetector')
            'CallExpression[callee.name="require"]'(node) {
                const firstArg = node.arguments[0];
                if (firstArg &&
                    firstArg.type === TSESTree.AST_NODE_TYPES.Literal &&
                    firstArg.value === "i18next-browser-languagedetector") {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },
        };
        function isLocalStorageGetItemLanguage(node) {
            const callee = node.callee;
            if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return false;
            }
            // Check .getItem('language')
            if (callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                callee.property.name !== "getItem") {
                return false;
            }
            const firstArg = node.arguments[0];
            if (!firstArg ||
                firstArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                firstArg.value !== "language") {
                return false;
            }
            // Check localStorage (direct or via variable)
            const obj = callee.object;
            if (obj.type === TSESTree.AST_NODE_TYPES.Identifier && obj.name === "localStorage") {
                return true;
            }
            // window.localStorage.getItem('language')
            if (obj.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                obj.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.property.name === "localStorage") {
                return true;
            }
            return false;
        }
    },
});
