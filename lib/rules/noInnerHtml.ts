import { TSESTree, TSESLint } from "@typescript-eslint/utils";
//import * as ts from "typescript"; // Not strictly needed if using checker methods directly

export default {
	name: "no-inner-html",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Disallow assignment to innerHTML/outerHTML or use of insertAdjacentHTML",
			url: "https://github.com/microsoft/eslint-plugin-sdl/blob/master/docs/rules/no-inner-html.md",
		},
		schema: [],
		messages: {
			noInnerHtml:
				"Do not write to DOM directly using innerHTML/outerHTML property",
			noInsertAdjacentHTML:
				"Do not write to DOM using insertAdjacentHTML method",
		},
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<
			"noInnerHtml" | "noInsertAdjacentHTML",
			[]
		>
	) {
		const parserServices = context.sourceCode.parserServices;
		const useTypeInfo = !!(
			parserServices &&
			parserServices.program &&
			parserServices.esTreeNodeToTSNodeMap
		);

		function isDomMemberAccess(
			objectNode: TSESTree.Expression,
			memberName: string
		): boolean {
			if (!useTypeInfo || !parserServices) {
				return false;
			}

			if (
				!parserServices.esTreeNodeToTSNodeMap ||
				!parserServices.program
			) {
				//Parser services or TypeScript program not available.,
				return false;
			}

			const tsObjectNode =
				parserServices.esTreeNodeToTSNodeMap.get(objectNode);
			if (!tsObjectNode) {
				return false;
			}

			const checker = parserServices.program.getTypeChecker();
			const originalObjectType = checker.getTypeAtLocation(tsObjectNode);

			const typesToCheck: any[] = []; // Using any[] for simplicity with checker types

			if (originalObjectType.isUnion()) {
				originalObjectType.types.forEach((t) => {
					const typeString = checker.typeToString(t);
					if (
						typeString !== "null" &&
						typeString !== "undefined" &&
						typeString !== "never"
					) {
						typesToCheck.push(t);
					}
				});
			} else {
				const originalTypeString =
					checker.typeToString(originalObjectType);
				if (
					originalTypeString !== "null" &&
					originalTypeString !== "undefined" &&
					originalTypeString !== "never"
				) {
					typesToCheck.push(originalObjectType);
				}
			}

			if (typesToCheck.length === 0) {
				return false;
			}

			for (const objectType of typesToCheck) {
				const memberSymbol = checker.getPropertyOfType(
					objectType,
					memberName
				);
				if (memberSymbol) {
					if (
						memberSymbol.declarations &&
						memberSymbol.declarations.length > 0
					) {
						for (const declaration of memberSymbol.declarations) {
							const sourceFile = declaration.getSourceFile();
							const sourceFileName = sourceFile.fileName;

							if (
								sourceFile.isDeclarationFile &&
								(sourceFileName.includes(
									"/node_modules/typescript/lib/lib.dom.d.ts"
								) ||
									sourceFileName.includes(
										"/node_modules/typescript/lib/lib.webworker.d.ts"
									) ||
									sourceFileName.includes(
										"/node_modules/typescript/lib/lib.dom.iterable.d.ts"
									) ||
									sourceFileName.includes("lib.dom.d.ts") ||
									sourceFileName.includes(
										"lib.webworker.d.ts"
									) ||
									sourceFileName.includes(
										"lib.dom.iterable.d.ts"
									))
							) {
								return true;
							}
						}
					}
				}
			}
			return false;
		}

		return {
			AssignmentExpression(node: TSESTree.AssignmentExpression) {
				if (
					node.left.type !== TSESTree.AST_NODE_TYPES.MemberExpression
				) {
					return;
				}
				const memberExpr = node.left;
				if (
					memberExpr.property.type !==
					TSESTree.AST_NODE_TYPES.Identifier
				) {
					return;
				}
				const propertyName = memberExpr.property.name;

				if (
					propertyName === "innerHTML" ||
					propertyName === "outerHTML"
				) {
					if (
						propertyName === "innerHTML" &&
						node.right.type === TSESTree.AST_NODE_TYPES.Literal &&
						node.right.value === ""
					) {
						return;
					}

					if (isDomMemberAccess(memberExpr.object, propertyName)) {
						context.report({
							node: memberExpr.property,
							messageId: "noInnerHtml",
						});
					}
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type !==
					TSESTree.AST_NODE_TYPES.MemberExpression
				) {
					return;
				}
				const memberExpr = node.callee;
				if (
					memberExpr.property.type !==
					TSESTree.AST_NODE_TYPES.Identifier
				) {
					return;
				}
				const methodName = memberExpr.property.name;

				if (methodName === "insertAdjacentHTML") {
					if (node.arguments.length === 2) {
						if (isDomMemberAccess(memberExpr.object, methodName)) {
							context.report({
								node: memberExpr.property,
								messageId: "noInsertAdjacentHTML",
							});
						}
					}
				}
			},
		};
	},
};
