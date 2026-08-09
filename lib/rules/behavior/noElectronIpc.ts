import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const IPC_APIS = new Set(["ipcRenderer", "ipcMain"]);

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect usage of Electron IPC for privileged inter-process communication.",
			url: docsUrl("no-electron-ipc", "behavior"),
		},
		schema: [],
		messages: {
			electronIpc:
				"Usage of Electron IPC ({{api}}) allows privileged operations outside the normal plugin sandbox.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				if (node.source.value !== "electron") {
					return;
				}
				for (const specifier of node.specifiers) {
					if (
						specifier.type === AST_NODE_TYPES.ImportSpecifier &&
						specifier.imported.type === AST_NODE_TYPES.Identifier &&
						IPC_APIS.has(specifier.imported.name)
					) {
						context.report({
							node: specifier,
							messageId: "electronIpc",
							data: { api: specifier.imported.name },
						});
					}
				}
			},

			MemberExpression(node: TSESTree.MemberExpression) {
				if (
					node.object.type !== AST_NODE_TYPES.Identifier ||
					node.object.name !== "electron"
				) {
					return;
				}

				let propertyName: string | undefined;
				if (
					!node.computed &&
					node.property.type === AST_NODE_TYPES.Identifier
				) {
					propertyName = node.property.name;
				} else if (
					node.computed &&
					node.property.type === AST_NODE_TYPES.Literal &&
					typeof node.property.value === "string"
				) {
					propertyName = node.property.value;
				}

				if (propertyName && IPC_APIS.has(propertyName)) {
					context.report({
						node,
						messageId: "electronIpc",
						data: { api: propertyName },
					});
				}
			},
		};
	},
});
