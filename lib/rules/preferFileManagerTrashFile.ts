import { TSESTree } from "@typescript-eslint/utils";
import { getParserServices } from "@typescript-eslint/utils/eslint-utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_METHODS = new Set(["trash", "delete"]);

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
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.",
            url: docsUrl("prefer-file-manager-trash-file"),
            requiresTypeChecking: true,
        },
        schema: [],
        messages: {
            preferTrashFile:
                "Use 'FileManager.trashFile()' instead of 'Vault.{{methodName}}()' to respect the user's file deletion preference.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node: TSESTree.CallExpression) {
                const callee = node.callee;
                if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                const methodName = getPropertyName(callee);
                if (methodName === undefined || !BANNED_METHODS.has(methodName)) {
                    return;
                }

                // Now, check the type of the object (`vault` in `vault.trash()`),
                // without null and undefined: `Vault | null`, an optional
                // `vault?: Vault` and `plugin?.app.vault` (typed
                // `Vault | undefined` inside the chain) are unions, which have
                // no symbol of their own.
                const objectType = checker.getNonNullableType(services.getTypeAtLocation(callee.object));
                const symbol = objectType.getSymbol();

                // Check if the symbol's name is 'Vault'. This is robust and
                // works even if the type is imported from 'obsidian'.
                if (symbol?.name === "Vault") {
                    context.report({
                        node: callee.property, // Highlight the method name (`trash` or `delete`)
                        messageId: "preferTrashFile",
                        data: {
                            methodName,
                        },
                    });
                }
            },
        };
    },
});
