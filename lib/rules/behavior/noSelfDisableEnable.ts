import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect plugins that programmatically disable and re-enable themselves.",
			url: docsUrl("no-self-disable-enable", "behavior"),
		},
		schema: [],
		messages: {
			selfDisableEnable:
				"Plugin programmatically disables and re-enables itself. This is a known technique for executing newly downloaded code without user awareness.",
		},
	},
	defaultOptions: [],
	create(context) {
		let disableNode: TSESTree.Node | null = null;
		let enableNode: TSESTree.Node | null = null;

		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type !== AST_NODE_TYPES.MemberExpression ||
					node.callee.property.type !== AST_NODE_TYPES.Identifier
				) {
					return;
				}

				const methodName = node.callee.property.name;
				if (
					methodName !== "disablePlugin" &&
					methodName !== "enablePlugin"
				) {
					return;
				}

				// Check that the object is *.plugins
				if (
					node.callee.object.type !== AST_NODE_TYPES.MemberExpression ||
					node.callee.object.property.type !==
						AST_NODE_TYPES.Identifier ||
					node.callee.object.property.name !== "plugins"
				) {
					return;
				}

				if (methodName === "disablePlugin") {
					disableNode = node;
				} else {
					enableNode = node;
				}
			},

			"Program:exit"() {
				if (disableNode && enableNode) {
					context.report({
						node: disableNode,
						messageId: "selfDisableEnable",
					});
					context.report({
						node: enableNode,
						messageId: "selfDisableEnable",
					});
				}
			},
		};
	},
});
