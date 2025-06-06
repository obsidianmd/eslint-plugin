import { TSESLint, TSESTree } from "@typescript-eslint/utils";

const BANNED_CAST_TYPES = new Set(["TFile", "TFolder"]);

export default {
	name: "no-tfile-tfolder-cast",
	meta: {
		type: "suggestion" as const,
		docs: {
			description:
				"Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.",
			recommended: true,
		},
		schema: [],
		messages: {
			avoidCast:
				"Avoid casting to '{{typeName}}'. Use an 'instanceof {{typeName}}' check to safely narrow the type.",
		},
		// This rule is not auto-fixable because the correction requires
		// changing the code's control flow (e.g., adding an if-block),
		// which is too complex and potentially breaking for an auto-fix.
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<"avoidCast", []>,
	): TSESLint.RuleListener {
		// The handler for both TSAsExpression and TSTypeAssertion nodes.
		// It checks if the type being cast to is TFile or TFolder.
		const handler = (
			node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
		) => {
			const typeAnnotation = node.typeAnnotation;

			// We only care about simple type references like `as TFile`
			if (
				typeAnnotation.type === "TSTypeReference" &&
				typeAnnotation.typeName.type === "Identifier"
			) {
				const typeName = typeAnnotation.typeName.name;
				if (BANNED_CAST_TYPES.has(typeName)) {
					context.report({
						node: typeAnnotation,
						messageId: "avoidCast",
						data: {
							typeName,
						},
					});
				}
			}
		};

		return {
			// Catches `value as TFile`
			TSAsExpression: handler,
			// Catches `<TFile>value`
			TSTypeAssertion: handler,
		};
	},
};
