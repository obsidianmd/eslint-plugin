import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const STORAGE_NAMES = new Set(["localStorage", "sessionStorage"]);
const STORAGE_METHODS = new Set(["setItem", "getItem", "removeItem"]);

function getStorageName(
	node: TSESTree.Expression,
): string | undefined {
	if (
		node.type === AST_NODE_TYPES.Identifier &&
		STORAGE_NAMES.has(node.name)
	) {
		return node.name;
	}

	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		node.object.name === "window" &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		STORAGE_NAMES.has(node.property.name)
	) {
		return node.property.name;
	}

	return undefined;
}

export default ruleCreator({
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Detect usage of localStorage or sessionStorage instead of the Obsidian plugin data APIs.",
			url: docsUrl("no-local-storage", "behavior"),
		},
		schema: [],
		messages: {
			localStorage:
				"Using {{api}} to persist data. Consider using Obsidian's plugin data APIs instead.",
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
					!STORAGE_METHODS.has(callee.property.name)
				) {
					return;
				}

				const storageName = getStorageName(callee.object);
				if (!storageName) {
					return;
				}

				context.report({
					node,
					messageId: "localStorage",
					data: {
						api: `${storageName}.${callee.property.name}()`,
					},
				});
			},
		};
	},
});
