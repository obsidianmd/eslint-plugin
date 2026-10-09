import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect usage of hardware fingerprinting libraries like node-machine-id.",
			url: docsUrl("no-hardware-fingerprinting", "behavior"),
		},
		schema: [],
		messages: {
			hardwareFingerprinting:
				'Usage of hardware fingerprinting library "node-machine-id" violates Obsidian\'s developer policies and user privacy.',
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				if (node.source.value === "node-machine-id") {
					context.report({
						node,
						messageId: "hardwareFingerprinting",
					});
				}
			},

			ImportExpression(node: TSESTree.ImportExpression) {
				if (
					node.source.type === AST_NODE_TYPES.Literal &&
					node.source.value === "node-machine-id"
				) {
					context.report({
						node,
						messageId: "hardwareFingerprinting",
					});
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				// require("node-machine-id")
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === AST_NODE_TYPES.Literal &&
					(node.arguments[0] as TSESTree.Literal).value ===
						"node-machine-id"
				) {
					context.report({
						node,
						messageId: "hardwareFingerprinting",
					});
					return;
				}

				// machineId() or machineIdSync()
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					(node.callee.name === "machineId" ||
						node.callee.name === "machineIdSync")
				) {
					context.report({
						node,
						messageId: "hardwareFingerprinting",
					});
				}
			},
		};
	},
});
