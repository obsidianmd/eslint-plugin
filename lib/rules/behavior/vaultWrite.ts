import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const VAULT_WRITE_METHODS = new Set([
	"create",
	"modify",
	"delete",
	"rename",
	"copy",
	"trash",
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

function isAdapterObject(node: TSESTree.Expression): boolean {
	if (node.type === AST_NODE_TYPES.Identifier && node.name === "adapter")
		return true;
	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === "adapter"
	)
		return true;
	return false;
}

export default ruleCreator({
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Detect writes or modifications to vault files via the Obsidian API.",
			url: docsUrl("vault-write", "behavior"),
		},
		schema: [],
		messages: {
			vaultWrite: "Plugin modifies vault files via {{api}}.",
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
					VAULT_WRITE_METHODS.has(methodName)
				) {
					context.report({
						node,
						messageId: "vaultWrite",
						data: { api: `vault.${methodName}()` },
					});
					return;
				}

				if (
					isAdapterObject(callee.object) &&
					methodName === "write"
				) {
					context.report({
						node,
						messageId: "vaultWrite",
						data: { api: "adapter.write()" },
					});
				}
			},
		};
	},
});
