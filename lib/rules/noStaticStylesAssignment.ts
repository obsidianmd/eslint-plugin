import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// This rule will flag:
//
// - element.style.color = 'red'
// - element.style.setProperty('color', 'red')
// - element.style.cssText = 'color: red;'
// - element.setAttribute('style', 'color: red;')
//
// This rule will not flag:
//
// - element.style.width = myWidth; (assignment from a variable)
// - element.style.transform = `translateX(${offset}px)`; (assignment from a template literal with expressions)

// Checks if a node is a MemberExpression accessing the 'style' property.
// e.g., `el.style` or `this.containerEl.style`
function isStyleMemberExpression(
	node: TSESTree.Node,
): node is TSESTree.MemberExpression {
	return (
		node.type === "MemberExpression" &&
		!node.computed &&
		node.property.type === "Identifier" &&
		node.property.name === "style"
	);
}

export default ruleCreator({
	name: "no-static-styles-assignment",
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Disallow setting styles directly on DOM elements, favoring CSS classes instead.",
		},
		schema: [],
		messages: {
			avoidStyleAssignment:
				"Avoid setting styles directly via `{{property}}`. Use CSS classes for better theming and maintainability. Use the `setCssProps` function to change CSS properties.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			// Catches `el.style.color = 'red'` and `el.style.cssText = '...'`
			AssignmentExpression(node: TSESTree.AssignmentExpression) {
				const left = node.left;
				// We only care about static assignments (literals)
				if (node.right.type !== "Literal") {
					return;
				}

				if (
					left.type === "MemberExpression" &&
					isStyleMemberExpression(left.object)
				) {
					context.report({
						node,
						messageId: "avoidStyleAssignment",
						data: {
							property: `element.style.${(left.property as TSESTree.Identifier).name}`,
						},
					});
				}
			},

			// Catches `el.style.setProperty(...)` and `el.setAttribute('style', ...)`
			CallExpression(node: TSESTree.CallExpression) {
				const callee = node.callee;
				if (callee.type !== "MemberExpression") {
					return;
				}

				const propertyName = (callee.property as TSESTree.Identifier)
					.name;

				// Case 1: `el.style.setProperty('color', 'red')`
				if (
					propertyName === "setProperty" &&
					isStyleMemberExpression(callee.object)
				) {
					// Check if the second argument is a literal
					if (
						node.arguments.length > 1 &&
						node.arguments[1].type === "Literal"
					) {
						context.report({
							node,
							messageId: "avoidStyleAssignment",
							data: { property: "element.style.setProperty" },
						});
					}
				}

				// Case 2: `el.setAttribute('style', '...')`
				if (propertyName === "setAttribute") {
					if (
						node.arguments.length > 1 &&
						node.arguments[0].type === "Literal" &&
						node.arguments[0].value === "style" &&
						node.arguments[1].type === "Literal"
					) {
						context.report({
							node,
							messageId: "avoidStyleAssignment",
							data: { property: "element.setAttribute" },
						});
					}
				}
			},
		};
	},
});
