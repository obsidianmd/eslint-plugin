import {
	ParserServices,
	ESLintUtils,
	TSESTree,
} from "@typescript-eslint/utils";
import ts from "typescript";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// Recursively checks if a type is or extends the 'Plugin' class.
function isPluginType(type: ts.Type, services: ParserServices): boolean {
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

export default ruleCreator({
	name: "no-plugin-as-component",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks.",
		},
		schema: [],
		messages: {
			avoidPluginComponent:
				"Avoid using the main plugin instance as a component. Its lifecycle is too long, which can cause memory leaks.",
			avoidNewComponent:
				"Do not pass a `new Component()` directly. Store it in a variable to ensure its `unload()` method can be called.",
		},
	},
	defaultOptions: [],
	create(context) {
		const services = ESLintUtils.getParserServices(context);

		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (node.arguments.length < 5) return;

				const callee = node.callee;
				if (callee.type !== "MemberExpression") return;

				if (
					callee.property.type !== "Identifier" ||
					callee.property.name !== "render"
				) {
					return;
				}

				const rendererType = services.getTypeAtLocation(callee.object);
				if (rendererType.getSymbol()?.name !== "MarkdownRenderer") {
					return;
				}

				const componentArg = node.arguments[4];

				// Check 1: Is the argument a `new Component()` expression?
				if (componentArg.type === "NewExpression") {
					context.report({
						node: componentArg,
						messageId: "avoidNewComponent",
					});
					return; // No need to check type if we already found this error
				}

				// Check 2: Is the type of the argument a `Plugin`?
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
});
