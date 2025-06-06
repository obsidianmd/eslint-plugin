import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import fs from "node:fs";
import path from "node:path";

// --- Schema Definitions ---

const BASE_SCHEMA = {
	author: "string",
	minAppVersion: "string",
	name: "string",
	version: "string",
};

const PLUGIN_ONLY_SCHEMA = {
	id: "string",
	description: "string",
	isDesktopOnly: "boolean",
};

const OPTIONAL_SCHEMA = {
	authorUrl: "string",
	fundingUrl: "string|object",
};

const THEME_SCHEMA = { ...BASE_SCHEMA };
const PLUGIN_SCHEMA = { ...BASE_SCHEMA, ...PLUGIN_ONLY_SCHEMA };

// --- Helper Functions ---

function getAstNodeType(node: TSESTree.Node): string {
	if (node.type === "Literal") {
		if (node.value === null) return "null";
		return typeof node.value;
	}
	if (node.type === "ObjectExpression") return "object";
	if (node.type === "ArrayExpression") return "array";
	return "unknown";
}

// --- Rule Definition ---
export default {
	name: "validate-manifest",
	meta: {
		type: "problem" as const,
		docs: {
			description:
				"Validate the structure of manifest.json for Obsidian plugins and themes",
			recommended: true,
			url: "https://docs.obsidian.md/Reference/Manifest",
		},
		schema: [],
		messages: {
			missingKey:
				"The manifest is missing the required '{{key}}' property.",
			invalidType:
				"The '{{key}}' property must be of type '{{expectedType}}', but was '{{actualType}}'.",
			disallowedKey:
				"The '{{key}}' property is not allowed in a theme manifest.",
			invalidFundingUrl:
				"The 'fundingUrl' object must only contain string values.",
			mustBeRootObject: "The manifest must be a single JSON object.",
			noObsidianBranding:
				"The word 'Obsidian' is not allowed in the manifest.",
		},
	},
	defaultOptions: [],
	create(
		context: TSESLint.RuleContext<
			| "missingKey"
			| "invalidType"
			| "disallowedKey"
			| "invalidFundingUrl"
			| "mustBeRootObject"
			| "noObsidianBranding",
			[]
		>,
	) {
		const filename = context.physicalFilename;
		if (!path.basename(filename).endsWith("manifest.json")) {
			return {};
		}

		const projectRoot = context.cwd;
		const themeCssPath = path.join(projectRoot, "theme.css");
		const isTheme = fs.existsSync(themeCssPath);

		const requiredKeys = isTheme ? THEME_SCHEMA : PLUGIN_SCHEMA;
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

				// 1. Check for missing required keys
				for (const key of Object.keys(requiredKeys)) {
					if (!presentKeys.has(key)) {
						context.report({
							node,
							messageId: "missingKey",
							data: { key },
						});
					}
				}

				// 2. Check types and disallowed keys
				for (const [key, propNode] of presentKeys.entries()) {
					if (
						isTheme &&
						key &&
						(key as string) in PLUGIN_ONLY_SCHEMA
					) {
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
						if (
							key === "fundingUrl" &&
							actualType === "object" &&
							valueNode.type === "ObjectExpression"
						) {
							for (const prop of valueNode.properties as TSESTree.Property[]) {
								if (getAstNodeType(prop.value) !== "string") {
									context.report({
										node: prop.value,
										messageId: "invalidFundingUrl",
									});
								}
							}
							// check for Obsidian branding
						} else if (
							actualType === "string" &&
							valueNode.type === "Literal" &&
							typeof valueNode.value === "string" &&
							(valueNode.value as string)
								.toLowerCase()
								.includes("obsidian") &&
							["name", "description"].includes(key as string)
						) {
							context.report({
								node: valueNode,
								messageId: "noObsidianBranding",
							});
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
};
