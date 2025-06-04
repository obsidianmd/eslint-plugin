import { TSESTree, TSESLint } from "@typescript-eslint/utils";

("use strict");

export default {
	name: "no-document-write",
	meta: {
		type: "problem" as const,
		schema: [],
		docs: {
			category: "Security",
			description:
				"Calls to document.write or document.writeln manipulate DOM directly without any sanitization and should be avoided. Use document.createElement() or similar methods instead.",
			url: "https://github.com/microsoft/eslint-plugin-sdl/blob/master/docs/rules/no-document-write.md",
		},
		messages: {
			noDocumentWrite:
				"Do not write to DOM directly using document.write or document.writeln methods",
		},
	},
	defaultOptions: [],
	create: (context: TSESLint.RuleContext<"noDocumentWrite", []>) => {
		const parserServices = context.sourceCode.parserServices;

		const useTypeInfo =
			parserServices &&
			parserServices.program &&
			parserServices.esTreeNodeToTSNodeMap;

		function getResolvedVariable(
			initialScope: TSESLint.Scope.Scope,
			name: string
		): TSESLint.Scope.Variable | null {
			let currentScope: TSESLint.Scope.Scope | null = initialScope;
			while (currentScope) {
				const variable = currentScope.set.get(name);
				if (variable) {
					return variable;
				}
				currentScope = currentScope.upper;
			}
			return null;
		}

		function isDomDocumentObject(
			expressionNode: TSESTree.Expression
		): boolean {
			const nodeText = context.getSourceCode().getText(expressionNode);
			// console.log(`isDomDocumentObject for "${nodeText}" (useTypeInfo: ${useTypeInfo})`);

			if (
				useTypeInfo &&
				parserServices &&
				parserServices.program &&
				parserServices.esTreeNodeToTSNodeMap
			) {
				const checker = parserServices.program.getTypeChecker();
				const tsNode =
					parserServices.esTreeNodeToTSNodeMap.get(expressionNode);

				if (tsNode) {
					try {
						const type = checker.getTypeAtLocation(tsNode);
						const typeString = checker.typeToString(type);
						if (typeString === "Document") {
							return true;
						}
					} catch (e) {
						console.error(
							`[TYPE CHECK ERROR] Node: "${nodeText}", Error:`,
							e
						);
					}
				}
				return false;
			}

			// Fallback logic for when type information is NOT available
			if (
				expressionNode.type === TSESTree.AST_NODE_TYPES.Identifier &&
				expressionNode.name === "document"
			) {
				const scope = context.getScope();
				const variable = getResolvedVariable(scope, "document");
				if (!variable || variable.scope.type === "global") {
					return true; // Implicit global or explicitly global
				}
				return false;
			} else if (
				expressionNode.type ===
					TSESTree.AST_NODE_TYPES.MemberExpression &&
				expressionNode.property.type ===
					TSESTree.AST_NODE_TYPES.Identifier &&
				expressionNode.property.name === "document" &&
				expressionNode.object.type ===
					TSESTree.AST_NODE_TYPES.Identifier &&
				expressionNode.object.name === "window"
			) {
				const scope = context.getScope();
				const variable = getResolvedVariable(scope, "window");
				if (!variable || variable.scope.type === "global") {
					return true; // Implicit global or explicitly global window
				}
				return false;
			}
			return false;
		}

		return {
			CallExpression(node: TSESTree.CallExpression) {
				const callee = node.callee;

				if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
					return;
				}

				const property = callee.property;
				if (property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
					return;
				}

				const methodName = property.name;
				if (methodName !== "write" && methodName !== "writeln") {
					return;
				}

				const objectNode = callee.object;
				if (isDomDocumentObject(objectNode)) {
					context.report({
						node: property,
						messageId: "noDocumentWrite",
					});
				}
			},
		};
	},
};
