import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const FS_MODULES = new Set([
	"fs",
	"node:fs",
	"fs/promises",
	"node:fs/promises",
]);

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect usage of the Node.js fs module for direct filesystem access outside the Obsidian vault API.",
			url: docsUrl("no-filesystem-access", "behavior"),
		},
		schema: [],
		messages: {
			filesystemAccess:
				'Direct filesystem access via Node.js "{{module}}" module. This can read and write any file on the system.',
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				if (FS_MODULES.has(node.source.value)) {
					context.report({
						node,
						messageId: "filesystemAccess",
						data: { module: node.source.value },
					});
				}
			},

			ImportExpression(node: TSESTree.ImportExpression) {
				if (
					node.source.type === AST_NODE_TYPES.Literal &&
					typeof node.source.value === "string" &&
					FS_MODULES.has(node.source.value)
				) {
					context.report({
						node,
						messageId: "filesystemAccess",
						data: { module: node.source.value },
					});
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === AST_NODE_TYPES.Literal &&
					typeof (node.arguments[0] as TSESTree.Literal).value ===
						"string" &&
					FS_MODULES.has(
						(node.arguments[0] as TSESTree.Literal).value as string
					)
				) {
					context.report({
						node,
						messageId: "filesystemAccess",
						data: {
							module: (node.arguments[0] as TSESTree.Literal)
								.value as string,
						},
					});
				}
			},
		};
	},
});
