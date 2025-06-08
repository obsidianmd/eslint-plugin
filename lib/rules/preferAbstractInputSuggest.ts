import { TSESLint, TSESTree } from "@typescript-eslint/utils";

export default {
	name: "no-deprecated-text-input-suggest",
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Disallow Liam's frequently copied `TextInputSuggest` implementation in favor of the built-in `AbstractInputSuggest`.",
			recommended: true,
		},
		schema: [],
		messages: {
			useAbstractInputSuggest:
				"This appears to be a custom `TextInputSuggest` implementation. Please use the built-in `AbstractInputSuggest` API instead.",
		},
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<"useAbstractInputSuggest", []>,
	): TSESLint.RuleListener {
		return {
			// We start by looking for any call to a function named `createPopper`.
			"CallExpression[callee.name='createPopper']"(
				node: TSESTree.CallExpression,
			) {
				// The options object is the 3rd argument.
				const options = node.arguments[2];
				if (options?.type !== "ObjectExpression") {
					return;
				}

				// Find the `modifiers` property within the options.
				const modifiersProp = options.properties.find(
					(
						prop,
					): prop is TSESTree.Property & {
						key: TSESTree.Identifier;
					} =>
						prop.type === "Property" &&
						prop.key.type === "Identifier" &&
						prop.key.name === "modifiers",
				);

				if (
					!modifiersProp ||
					modifiersProp.value.type !== "ArrayExpression"
				) {
					return;
				}

				// Check if any modifier in the array has the name "sameWidth".
				const hasSameWidthModifier = modifiersProp.value.elements.some(
					(element) => {
						if (element?.type !== "ObjectExpression") {
							return false;
						}
						// Find the `name` property of the modifier object.
						const nameProp = element.properties.find(
							(
								prop,
							): prop is TSESTree.Property & {
								key: TSESTree.Identifier;
							} =>
								prop.type === "Property" &&
								prop.key.type === "Identifier" &&
								prop.key.name === "name",
						);
						// Check if its value is the literal string "sameWidth".
						return (
							nameProp?.value.type === "Literal" &&
							nameProp.value.value === "sameWidth"
						);
					},
				);

				if (hasSameWidthModifier) {
					context.report({
						node,
						messageId: "useAbstractInputSuggest",
					});
				}
			},
		};
	},
};
