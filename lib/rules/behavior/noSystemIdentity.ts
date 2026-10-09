import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";

const OS_IDENTITY_METHODS = new Set(["hostname", "userInfo", "networkInterfaces"]);
const ENV_IDENTITY_VARS = new Set(["HOME", "USERNAME", "USER", "USERPROFILE"]);

export default ruleCreator({
	meta: {
		type: "problem",
		docs: {
			description:
				"Detect reads of system identity information that could be used for fingerprinting.",
			url: docsUrl("no-system-identity", "behavior"),
		},
		schema: [],
		messages: {
			systemIdentity:
				"Reading system identity information ({{api}}) may be used to fingerprint the user's machine.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			// os.hostname(), os.userInfo(), os.networkInterfaces()
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.name === "os" &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					OS_IDENTITY_METHODS.has(node.callee.property.name)
				) {
					context.report({
						node,
						messageId: "systemIdentity",
						data: {
							api: `os.${node.callee.property.name}()`,
						},
					});
				}
			},

			// process.env.HOME, process.env.USERNAME, etc.
			MemberExpression(node: TSESTree.MemberExpression) {
				if (
					node.object.type === AST_NODE_TYPES.MemberExpression &&
					node.object.object.type === AST_NODE_TYPES.Identifier &&
					node.object.object.name === "process" &&
					node.object.property.type === AST_NODE_TYPES.Identifier &&
					node.object.property.name === "env" &&
					node.property.type === AST_NODE_TYPES.Identifier &&
					ENV_IDENTITY_VARS.has(node.property.name)
				) {
					context.report({
						node,
						messageId: "systemIdentity",
						data: {
							api: `process.env.${node.property.name}`,
						},
					});
				}
			},
		};
	},
});
