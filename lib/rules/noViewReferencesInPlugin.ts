import {
	ESLintUtils,
	ParserServices,
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";
import type ts from "typescript";

/**
 * Recursively checks if a type is or extends a specific class name.
 */
function isSubclassOf(
	type: ts.Type,
	className: string,
	services: ParserServices,
): boolean {
	const constraint = type.getConstraint();
	if (constraint) {
		type = constraint;
	}

	const symbol = type.getSymbol();
	if (symbol?.name === className) {
		return true;
	}

	const baseTypes = type.getBaseTypes();
	if (baseTypes) {
		for (const baseType of baseTypes) {
			if (isSubclassOf(baseType, className, services)) {
				return true;
			}
		}
	}

	return false;
}

export default {
	name: "no-view-references-in-plugin",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Disallow storing references to custom views directly in the plugin, which can cause memory leaks.",
			recommended: true,
		},
		schema: [],
		messages: {
			avoidViewReference:
				"Do not assign a view instance to a plugin property within `registerView`. This can cause memory leaks. Create and return the view directly.",
		},
		requiresTypeChecking: true,
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<"avoidViewReference", []>,
	): TSESLint.RuleListener {
		const services = ESLintUtils.getParserServices(context);

		/**
		 * Checks if a given node is the specific "bad assignment" we want to flag.
		 * e.g., `this.view = new MyCustomView()`
		 */
		const checkForBadAssignment = (
			node: TSESTree.Node | null | undefined,
		) => {
			if (
				node?.type === "AssignmentExpression" &&
				node.left.type === "MemberExpression" &&
				node.left.object.type === "ThisExpression" &&
				node.right.type === "NewExpression"
			) {
				const newInstanceType = services.getTypeAtLocation(node.right);
				if (isSubclassOf(newInstanceType, "View", services)) {
					context.report({
						node: node,
						messageId: "avoidViewReference",
					});
				}
			}
		};

		return {
			// Use a selector to efficiently find only `registerView` calls.
			"CallExpression[callee.property.name='registerView']"(
				callNode: TSESTree.CallExpression,
			) {
				const callee = callNode.callee;
				if (callee.type !== "MemberExpression") return;

				// 1. Verify the call is on a `Plugin` instance.
				const callerType = services.getTypeAtLocation(callee.object);
				if (!isSubclassOf(callerType, "Plugin", services)) return;

				// 2. Get the factory function (the 2nd argument).
				const factory = callNode.arguments[1];
				if (
					!factory ||
					(factory.type !== "ArrowFunctionExpression" &&
						factory.type !== "FunctionExpression")
				) {
					return;
				}

				// 3. Analyze the body of the factory function.
				const factoryBody = factory.body;

				// Case A: Implicit return, e.g., `() => this.view = new MyView()`
				if (factoryBody.type === "AssignmentExpression") {
					checkForBadAssignment(factoryBody);
				}
				// Case B: Explicit return, e.g., `() => { return this.view = new MyView() }`
				else if (factoryBody.type === "BlockStatement") {
					for (const statement of factoryBody.body) {
						if (statement.type === "ReturnStatement") {
							checkForBadAssignment(statement.argument);
						}
					}
				}
			},
		};
	},
};
