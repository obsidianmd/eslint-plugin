import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

/**
 * Checks if a node is the sample `registerInterval` call.
 * `this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));`
 */
function isSampleIntervalCall(node: TSESTree.CallExpression): boolean {
	// Check for `this.registerInterval(...)`
	if (
		node.callee.type !== "MemberExpression" ||
		node.callee.object.type !== "ThisExpression" ||
		node.callee.property.type !== "Identifier" ||
		node.callee.property.name !== "registerInterval"
	) {
		return false;
	}

	// Check for `window.setInterval(...)` as the first argument
	const setIntervalCall = node.arguments[0];
	if (
		!setIntervalCall ||
		setIntervalCall.type !== "CallExpression" ||
		setIntervalCall.callee.type !== "MemberExpression" ||
		(setIntervalCall.callee.object as TSESTree.Identifier)?.name !==
			"window" ||
		(setIntervalCall.callee.property as TSESTree.Identifier)?.name !==
			"setInterval"
	) {
		return false;
	}

	// Check for `() => console.log('setInterval')` as the first argument to setInterval
	const callback = setIntervalCall.arguments[0];
	if (
		!callback ||
		callback.type !== "ArrowFunctionExpression" ||
		callback.body.type !== "CallExpression" ||
		(callback.body.callee as TSESTree.MemberExpression)?.property.type !==
			"Identifier" ||
		(
			(callback.body.callee as TSESTree.MemberExpression)
				?.property as TSESTree.Identifier
		)?.name !== "log" ||
		(callback.body.arguments[0] as TSESTree.Literal)?.value !==
			"setInterval"
	) {
		return false;
	}

	return true;
}

/**
 * Checks if a node is the sample `registerDomEvent` call.
 * `this.registerDomEvent(document, 'click', (evt: MouseEvent) => { console.log('click', evt); });`
 */
function isSampleDomEventCall(node: TSESTree.CallExpression): boolean {
	// Check for `this.registerDomEvent(...)`
	if (
		node.callee.type !== "MemberExpression" ||
		node.callee.object.type !== "ThisExpression" ||
		node.callee.property.type !== "Identifier" ||
		node.callee.property.name !== "registerDomEvent"
	) {
		return false;
	}

	// Check for `document` and `'click'` as the first two arguments
	if (
		(node.arguments[0] as TSESTree.Identifier)?.name !== "document" ||
		(node.arguments[1] as TSESTree.Literal)?.value !== "click"
	) {
		return false;
	}

	// Check for the specific callback function
	const callback = node.arguments[2];
	if (
		!callback ||
		callback.type !== "ArrowFunctionExpression" ||
		callback.body.type !== "BlockStatement"
	) {
		return false;
	}

	const firstStatement = callback.body.body[0];
	if (
		!firstStatement ||
		firstStatement.type !== "ExpressionStatement" ||
		firstStatement.expression.type !== "CallExpression" ||
		(firstStatement.expression.callee as TSESTree.MemberExpression)
			?.property.type !== "Identifier" ||
		(
			(firstStatement.expression.callee as TSESTree.MemberExpression)
				?.property as TSESTree.Identifier
		)?.name !== "log" ||
		(firstStatement.expression.arguments[0] as TSESTree.Literal)?.value !==
			"click"
	) {
		return false;
	}

	return true;
}

export default ruleCreator({
	name: "no-sample-code",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Disallow sample code snippets from the Obsidian plugin template.",
		},
		schema: [],
		messages: {
			removeSampleInterval:
				"Remove the sample `registerInterval` call from the plugin template.",
			removeSampleDomEvent:
				"Remove the sample `registerDomEvent` call from the plugin template.",
		},
		fixable: "code" as const,
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (isSampleIntervalCall(node)) {
					context.report({
						node,
						messageId: "removeSampleInterval",
						fix: (fixer) => fixer.remove(node.parent), // Remove the entire ExpressionStatement
					});
				} else if (isSampleDomEventCall(node)) {
					context.report({
						node,
						messageId: "removeSampleDomEvent",
						fix: (fixer) => fixer.remove(node.parent), // Remove the entire ExpressionStatement
					});
				}
			},
		};
	},
});
