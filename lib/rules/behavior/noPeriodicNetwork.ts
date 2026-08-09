import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const NETWORK_APIS = new Set(["fetch", "requestUrl"]);
const SKIP_KEYS = new Set(["parent", "loc", "range", "tokens", "comments"]);

function containsNetworkCall(node: TSESTree.Node): string | null {
	if (node.type === AST_NODE_TYPES.CallExpression) {
		if (
			node.callee.type === AST_NODE_TYPES.Identifier &&
			NETWORK_APIS.has(node.callee.name)
		) {
			return node.callee.name;
		}
		if (
			node.callee.type === AST_NODE_TYPES.MemberExpression &&
			node.callee.property.type === AST_NODE_TYPES.Identifier &&
			NETWORK_APIS.has(node.callee.property.name)
		) {
			return node.callee.property.name;
		}
	}

	const nodeRecord = node as unknown as Record<string, unknown>;
	for (const key of Object.keys(nodeRecord)) {
		if (SKIP_KEYS.has(key)) continue;
		const value = nodeRecord[key];
		if (value && typeof value === "object") {
			if (Array.isArray(value)) {
				for (const item of value as unknown[]) {
					if (
						item &&
						typeof item === "object" &&
						"type" in item &&
						typeof item.type === "string"
					) {
						const result = containsNetworkCall(
							item as TSESTree.Node,
						);
						if (result) return result;
					}
				}
			} else if (
				"type" in value &&
				typeof (value as { type: unknown }).type === "string"
			) {
				const result = containsNetworkCall(value as TSESTree.Node);
				if (result) return result;
			}
		}
	}
	return null;
}

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect periodic network calls via setInterval combined with fetch or requestUrl.",
			url: docsUrl("no-periodic-network", "behavior"),
		},
		schema: [],
		messages: {
			periodicNetwork:
				"Plugin combines setInterval with network calls ({{api}}). This may indicate periodic background data transmission.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				let isSetInterval = false;

				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					node.callee.name === "setInterval"
				) {
					isSetInterval = true;
				} else if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.name === "window" &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.property.name === "setInterval"
				) {
					isSetInterval = true;
				}

				if (!isSetInterval || node.arguments.length === 0) {
					return;
				}

				const callback = node.arguments[0];
				if (
					callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
					callback.type !== AST_NODE_TYPES.FunctionExpression
				) {
					return;
				}

				const api = containsNetworkCall(callback.body);
				if (api) {
					context.report({
						node,
						messageId: "periodicNetwork",
						data: { api },
					});
				}
			},
		};
	},
});
