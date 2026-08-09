import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const VAULT_ENUMERATION_METHODS = new Set([
	"getFiles",
	"getAllLoadedFiles",
	"recurseChildren",
]);

function isVaultObject(node: TSESTree.Expression): boolean {
	if (node.type === AST_NODE_TYPES.Identifier && node.name === "vault")
		return true;
	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === "vault"
	)
		return true;
	return false;
}

export default ruleCreator({
	meta: {
		type: "suggestion",
		docs: {
			description: "Detect enumeration of all files in the vault.",
			url: docsUrl("vault-enumeration", "behavior"),
		},
		schema: [],
		messages: {
			vaultEnumeration:
				"Plugin enumerates vault files via {{api}}, giving access to every file path in the vault.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;

				const callee = node.callee;
				if (callee.property.type !== AST_NODE_TYPES.Identifier) return;

				const methodName = callee.property.name;

				if (
					isVaultObject(callee.object) &&
					VAULT_ENUMERATION_METHODS.has(methodName)
				) {
					context.report({
						node,
						messageId: "vaultEnumeration",
						data: { api: `vault.${methodName}()` },
					});
					return;
				}

				if (methodName === "getMarkdownFiles") {
					context.report({
						node,
						messageId: "vaultEnumeration",
						data: { api: "*.getMarkdownFiles()" },
					});
				}
			},
		};
	},
});
