import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const CLIPBOARD_OBJECTS = new Set(["navigator", "electron", "remote"]);

export default ruleCreator({
	meta: {
		type: "suggestion",
		docs: {
			description: "Detect access to the system clipboard.",
			url: docsUrl("clipboard-access", "behavior"),
		},
		schema: [],
		messages: {
			clipboardAccess:
				"Accessing the system clipboard ({{api}}) may expose content copied from outside Obsidian.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			MemberExpression(node: TSESTree.MemberExpression) {
				if (
					node.object.type !== AST_NODE_TYPES.Identifier ||
					!CLIPBOARD_OBJECTS.has(node.object.name)
				) {
					return;
				}

				let isClipboard = false;
				if (
					!node.computed &&
					node.property.type === AST_NODE_TYPES.Identifier &&
					node.property.name === "clipboard"
				) {
					isClipboard = true;
				} else if (
					node.computed &&
					node.property.type === AST_NODE_TYPES.Literal &&
					node.property.value === "clipboard"
				) {
					isClipboard = true;
				}

				if (isClipboard) {
					context.report({
						node,
						messageId: "clipboardAccess",
						data: { api: `${node.object.name}.clipboard` },
					});
				}
			},
		};
	},
});
