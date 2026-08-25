import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const READ_METHODS = new Set(["read", "cachedRead"]);

function isVaultObject(node: TSESTree.Expression): boolean {
	if (node.type === AST_NODE_TYPES.Identifier && node.name === "vault") {
		return true;
	}
	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === "vault"
	) {
		return true;
	}
	return false;
}

function isAdapterObject(node: TSESTree.Expression): boolean {
	if (node.type === AST_NODE_TYPES.Identifier && node.name === "adapter") {
		return true;
	}
	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === "adapter"
	) {
		return true;
	}
	return false;
}

export default ruleCreator({
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Detect reads of individual vault files via the Obsidian API.",
			url: docsUrl("vault-read", "behavior"),
		},
		schema: [],
		messages: {
			vaultRead: "Plugin reads vault files via {{api}}.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				const callee = node.callee;
				if (callee.type !== AST_NODE_TYPES.MemberExpression) {
					return;
				}

				if (
					callee.property.type !== AST_NODE_TYPES.Identifier ||
					!READ_METHODS.has(callee.property.name)
				) {
					return;
				}

				let objectLabel: string | undefined;
				if (isVaultObject(callee.object)) {
					objectLabel = "vault";
				} else if (isAdapterObject(callee.object)) {
					objectLabel = "adapter";
				}

				if (!objectLabel) {
					return;
				}

				context.report({
					node,
					messageId: "vaultRead",
					data: {
						api: `${objectLabel}.${callee.property.name}()`,
					},
				});
			},
		};
	},
});
