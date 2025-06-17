import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getParserServices } from "@typescript-eslint/utils/eslint-utils";

const BANNED_METHODS = new Set(["trash", "delete"]);

export default {
	name: "prefer-file-manager-trash-file",
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.",
			recommended: true,
		},
		schema: [],
		messages: {
			preferTrashFile:
				"Use 'FileManager.trashFile()' instead of 'Vault.{{methodName}}()' to respect the user's file deletion preference.",
		},
		// This rule requires type information to identify Vault instances.
		// The `.ts` extension is important for the parser to enable this.
		requiresTypeChecking: true,
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<"preferTrashFile", []>,
	): TSESLint.RuleListener {
		const services = getParserServices(context);

		return {
			CallExpression(node: TSESTree.CallExpression) {
				const callee = node.callee;
				if (callee.type !== "MemberExpression") {
					return;
				}

				const property = callee.property;
				if (
					property.type !== "Identifier" ||
					!BANNED_METHODS.has(property.name)
				) {
					return;
				}

				// Now, check the type of the object (`vault` in `vault.trash()`)
				const objectType = services.getTypeAtLocation(callee.object);
				const symbol = objectType.getSymbol();

				// Check if the symbol's name is 'Vault'. This is robust and
				// works even if the type is imported from 'obsidian'.
				if (symbol?.name === "Vault") {
					context.report({
						node: property, // Highlight the method name (`trash` or `delete`)
						messageId: "preferTrashFile",
						data: {
							methodName: property.name,
						},
					});
				}
			},
		};
	},
};
