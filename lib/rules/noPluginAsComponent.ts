import { ParserServices, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getParserServices } from "@typescript-eslint/utils/eslint-utils";
import ts from "typescript";

// Recursively checks if a type is or extends the 'Plugin' class.
// returns True if the type is a Plugin or a subclass of Plugin.
function isPluginType(type: ts.Type, services: ParserServices): boolean {
	// Use `getConstraint()` to resolve the `this` type to its class.
	const constraint = type.getConstraint();
	if (constraint) {
		type = constraint;
	}

	const symbol = type.getSymbol();
	if (symbol?.name === "Plugin") {
		return true;
	}

	const baseTypes = type.getBaseTypes();
	if (baseTypes) {
		for (const baseType of baseTypes) {
			if (isPluginType(baseType, services)) {
				return true;
			}
		}
	}

	return false;
}

export default {
	name: "no-plugin-as-component",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Disallow using the main plugin instance as a component for MarkdownRenderer.render to prevent memory leaks.",
			recommended: true,
		},
		schema: [],
		messages: {
			avoidPluginComponent:
				"Avoid using the main plugin instance as a component for `MarkdownRenderer.render`. Use a shorter-lived component (e.g., a View, Modal, or a new Component) to prevent memory leaks.",
		},
		requiresTypeChecking: true,
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<"avoidPluginComponent", []>,
	): TSESLint.RuleListener {
		const services = getParserServices(context);

		return {
			CallExpression(node: TSESTree.CallExpression) {
				// The call must have 5 arguments.
				if (node.arguments.length < 5) {
					return;
				}

				const callee = node.callee;
				if (callee.type !== "MemberExpression") {
					return;
				}

				// Check if the method is `render`.
				const property = callee.property;
				if (
					property.type !== "Identifier" ||
					property.name !== "render"
				) {
					return;
				}

				// Check if the object being called on is `MarkdownRenderer`.
				const rendererType = services.getTypeAtLocation(callee.object);
				if (rendererType.getSymbol()?.name !== "MarkdownRenderer") {
					return;
				}

				// Get the 5th argument (the component).
				const componentArg = node.arguments[4];
				const componentType = services.getTypeAtLocation(componentArg);

				if (isPluginType(componentType, services)) {
					context.report({
						node: componentArg,
						messageId: "avoidPluginComponent",
					});
				}
			},
		};
	},
};
