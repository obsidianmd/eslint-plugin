import { ESLintUtils } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
const INSTANCEABLE_BASE_TYPES = new Set(["Node", "UIEvent"]);
function isInstanceableType(type, services) {
    const constraint = type.getConstraint();
    if (constraint) {
        type = constraint;
    }
    const symbol = type.getSymbol();
    if (symbol && INSTANCEABLE_BASE_TYPES.has(symbol.name)) {
        return true;
    }
    const baseTypes = type.getBaseTypes();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (isInstanceableType(baseType, services)) {
                return true;
            }
        }
    }
    return false;
}
export default ruleCreator({
    name: "prefer-instanceof",
    meta: {
        type: "suggestion",
        docs: {
            description: "Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.",
        },
        schema: [],
        fixable: "code",
        messages: {
            preferInstanceof: "Use '.instanceOf({{className}})' instead of 'instanceof {{className}}' for cross-window safe type checking.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        return {
            BinaryExpression(node) {
                if (node.operator !== "instanceof") {
                    return;
                }
                const leftType = services.getTypeAtLocation(node.left);
                if (!isInstanceableType(leftType, services)) {
                    return;
                }
                const rightText = context.sourceCode.getText(node.right);
                const leftText = context.sourceCode.getText(node.left);
                context.report({
                    node,
                    messageId: "preferInstanceof",
                    data: {
                        className: rightText,
                    },
                    fix(fixer) {
                        return fixer.replaceText(node, `${leftText}.instanceOf(${rightText})`);
                    },
                });
            },
        };
    },
});
