import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const PLUGIN_FILES = new Set(["main.js", "manifest.json", "styles.css"]);
const WRITE_FUNCTIONS = new Set([
	"writeFileSync",
	"writeFile",
	"createWriteStream",
]);
const ZIP_MODULES = new Set(["adm-zip", "jszip"]);
const DECOMPRESS_METHODS = new Set(["unzip", "decompress"]);

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect plugins that appear to overwrite their own files by extracting an archive.",
			url: docsUrl("no-self-update", "behavior"),
		},
		schema: [],
		messages: {
			selfUpdate:
				"Plugin appears to overwrite its own files by extracting an archive. This is a self-update mechanism that bypasses Obsidian's plugin update process.",
		},
	},
	defaultOptions: [],
	create(context) {
		let hasFileRefs = false;
		let hasFileWrite = false;
		let zipNode: TSESTree.Node | null = null;

		return {
			Literal(node: TSESTree.Literal) {
				if (
					typeof node.value === "string" &&
					PLUGIN_FILES.has(node.value)
				) {
					hasFileRefs = true;
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					WRITE_FUNCTIONS.has(node.callee.name)
				) {
					hasFileWrite = true;
				}

				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					WRITE_FUNCTIONS.has(node.callee.property.name)
				) {
					hasFileWrite = true;
				}

				// require("adm-zip") or require("jszip")
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === AST_NODE_TYPES.Literal &&
					typeof node.arguments[0].value === "string" &&
					ZIP_MODULES.has(node.arguments[0].value)
				) {
					zipNode ??= node;
				}

				// *.unzip() or *.decompress()
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					DECOMPRESS_METHODS.has(node.callee.property.name)
				) {
					zipNode ??= node;
				}
			},

			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				if (
					typeof node.source.value === "string" &&
					ZIP_MODULES.has(node.source.value)
				) {
					zipNode ??= node;
				}
			},

			"Program:exit"() {
				if (hasFileRefs && hasFileWrite && zipNode) {
					context.report({
						node: zipNode,
						messageId: "selfUpdate",
					});
				}
			},
		};
	},
});
