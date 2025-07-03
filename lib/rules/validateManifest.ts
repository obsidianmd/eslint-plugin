import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";

const ruleCreator = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

const BASE_SCHEMA = {
	author: "string",
	minAppVersion: "string",
	name: "string",
	version: "string",
	id: "string",
	description: "string",
	isDesktopOnly: "boolean",
};

const OPTIONAL_SCHEMA = {
	authorUrl: "string",
	fundingUrl: "string|object",
};

const FORBIDDEN_WORDS = ["obsidian", "plugin"];

function hasForbiddenWords(str: string): [boolean, string] {
	let forbiddenWordsFound = new Set<string>();
	for (const word of FORBIDDEN_WORDS) {
		if (str.match(new RegExp(`\\b${word}\\b`, "i"))) {
			forbiddenWordsFound.add(word);
		}
	}
	if (forbiddenWordsFound.size > 0) {
		return [true, Array.from(forbiddenWordsFound).sort().join("' or '")];
	}
	return [false, ""];
}

function getAstNodeType(node: TSESTree.Node): string {
	if (node.type === "Literal") {
		if (node.value === null) return "null";
		return typeof node.value;
	}
	if (node.type === "ObjectExpression") return "object";
	if (node.type === "ArrayExpression") return "array";
	return "unknown";
}

export default ruleCreator({
	name: "validate-manifest",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Validate the structure of manifest.json for Obsidian plugins.",
			url: "https://docs.obsidian.md/Reference/Manifest",
		},
		schema: [],
		messages: {
			missingKey:
				"The manifest is missing the required '{{key}}' property.",
			invalidType:
				"The '{{key}}' property must be of type '{{expectedType}}', but was '{{actualType}}'.",
			disallowedKey:
				"The '{{key}}' property is not allowed in the manifest.",
			duplicateKey:
				"The '{{key}}' property is defined multiple times in the manifest.",
			invalidFundingUrl:
				"The 'fundingUrl' object must only contain string values.",
			emptyFundingUrlObject: "The 'fundingUrl' cannot be empty.",
			mustBeRootObject: "The manifest must be a single JSON object.",
			noForbiddenWords:
				"The '{{key}}' property cannot contain '{{word}}'.",
			descriptionFormat:
				"The 'description' property should be concise and follow the submission requirements.",
		},
	},
	defaultOptions: [],
	create(context) {
		const filename = context.physicalFilename;
		if (!path.basename(filename).endsWith("manifest.json")) {
			return {};
		}

		const requiredKeys = BASE_SCHEMA;
		const allAllowedKeys = { ...requiredKeys, ...OPTIONAL_SCHEMA };

		return {
			Program(programNode: TSESTree.Program) {
				const body = programNode.body[0];
				if (
					programNode.body.length !== 1 ||
					body.type !== "ExpressionStatement" ||
					body.expression.type !== "ObjectExpression"
				) {
					context.report({
						node: programNode,
						messageId: "mustBeRootObject",
					});
					return;
				}

				const node = body.expression;
				const properties = node.properties as TSESTree.Property[];
				const presentKeys = new Map(
					properties.map((prop) => [
						(prop.key as TSESTree.Literal).value,
						prop,
					]),
				);

				// 1. Check for duplicate keys
				if (properties.length !== presentKeys.size) {
					const seenKeys = new Set<string>();
					for (const prop of properties) {
						const key = (prop.key as TSESTree.Literal)
							.value as string;
						if (seenKeys.has(key)) {
							context.report({
								node: prop.key,
								messageId: "duplicateKey",
								data: { key },
							});
						} else {
							seenKeys.add(key);
						}
					}
				}

				// 2. Check for missing required keys
				for (const key of Object.keys(requiredKeys)) {
					if (!presentKeys.has(key)) {
						context.report({
							node,
							messageId: "missingKey",
							data: { key },
						});
					}
				}

				// 3. Check types and disallowed keys
				for (const [key, propNode] of presentKeys.entries()) {
					if (key && !((key as string) in allAllowedKeys)) {
						context.report({
							node: propNode.key,
							messageId: "disallowedKey",
							data: { key: key as string },
						});
						continue;
					}

					const expectedType =
						allAllowedKeys[key as keyof typeof allAllowedKeys];
					if (!expectedType) continue;

					const valueNode = propNode.value;
					const actualType = getAstNodeType(valueNode);

					if (expectedType.includes(actualType)) {
						if (key === "fundingUrl") {
							if (
								actualType === "object" &&
								valueNode.type === "ObjectExpression"
							) {
								if (valueNode.properties.length > 0) {
									// Check for duplicate keys in fundingUrl
									const fundingKeys = new Set<string>();
									for (const prop of valueNode.properties as TSESTree.Property[]) {
										const propKey = (
											prop.key as TSESTree.Literal
										).value as string;

										if (fundingKeys.has(propKey)) {
											context.report({
												node: prop.key,
												messageId: "duplicateKey",
												data: { key: propKey },
											});
										}

										fundingKeys.add(propKey);

										// Check if each property in fundingUrl is a string
										if (
											getAstNodeType(prop.value) !==
											"string"
										) {
											context.report({
												node: prop.value,
												messageId: "invalidFundingUrl",
												data: {
													key: key as string,
													expectedType: "string",
													actualType: getAstNodeType(
														prop.value,
													),
												},
											});
										}

										// Check for empty string values
										if (
											prop.value.type === "Literal" &&
											typeof prop.value.value ===
												"string" &&
											prop.value.value.length === 0
										) {
											context.report({
												node: prop.value,
												messageId:
													"emptyFundingUrlObject",
												data: { key: key as string },
											});
										}
									}
								} else {
									// Check for empty fundingUrl object
									context.report({
										node: valueNode,
										messageId: "emptyFundingUrlObject",
										data: { key: key as string },
									});
								}
							} else if (
								actualType === "string" &&
								valueNode.type === "Literal" &&
								typeof valueNode.value === "string" &&
								valueNode.value.length === 0
							) {
								context.report({
									node: valueNode,
									messageId: "emptyFundingUrlObject",
								});
							}
						} else if (
							// check for forbidden words in specific string fields
							actualType === "string" &&
							valueNode.type === "Literal" &&
							typeof valueNode.value === "string" &&
							hasForbiddenWords(valueNode.value)[0] &&
							(key === "name" ||
								key === "description" ||
								key === "id")
						) {
							context.report({
								node: valueNode,
								messageId: "noForbiddenWords",
								data: {
									word: hasForbiddenWords(valueNode.value)[1],
									key: key as string,
								},
							});
						} else if (
							actualType === "string" &&
							valueNode.type === "Literal" &&
							typeof valueNode.value === "string" &&
							key === "description"
						) {
							// Check description format
							const description = valueNode.value as string;
							if (
								// 10 characters min
								description.length < 10 ||
								// 250 characters max
								description.length > 250 ||
								// Should start with a capital letter
								!description.match(/^[A-Z]/) ||
								// Should end with a period
								!description.endsWith(".") ||
								// Should not contain emoji or special characters
								!description.match(/^[A-Za-z0-9\s.,!?'"-]+$/)
							) {
								context.report({
									node: valueNode,
									messageId: "descriptionFormat",
								});
							}
						}
					} else {
						context.report({
							node: valueNode,
							messageId: "invalidType",
							data: {
								key: key as string,
								expectedType: expectedType.replace("|", " or "),
								actualType,
							},
						});
					}
				}
			},
		};
	},
});
