import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const CP_MODULES = new Set(["child_process", "node:child_process"]);

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect usage of child_process for shell command execution.",
			url: docsUrl("no-shell-execution", "behavior"),
		},
		schema: [],
		messages: {
			shellExecution:
				"Shell execution via {{api}} gives the plugin full control over the system.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				if (CP_MODULES.has(node.source.value)) {
					context.report({
						node,
						messageId: "shellExecution",
						data: { api: node.source.value },
					});
				}
			},

			ImportExpression(node: TSESTree.ImportExpression) {
				if (
					node.source.type === AST_NODE_TYPES.Literal &&
					typeof node.source.value === "string" &&
					CP_MODULES.has(node.source.value)
				) {
					context.report({
						node,
						messageId: "shellExecution",
						data: { api: node.source.value },
					});
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				// require("child_process") or require("node:child_process")
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === AST_NODE_TYPES.Literal &&
					typeof (node.arguments[0] as TSESTree.Literal).value ===
						"string" &&
					CP_MODULES.has(
						(node.arguments[0] as TSESTree.Literal).value as string
					)
				) {
					context.report({
						node,
						messageId: "shellExecution",
						data: {
							api: (node.arguments[0] as TSESTree.Literal)
								.value as string,
						},
					});
					return;
				}

				// execSync() or spawnSync()
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					(node.callee.name === "execSync" ||
						node.callee.name === "spawnSync")
				) {
					context.report({
						node,
						messageId: "shellExecution",
						data: { api: `${node.callee.name}()` },
					});
				}
			},
		};
	},
});
