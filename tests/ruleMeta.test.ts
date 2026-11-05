import assert from "node:assert";
import fs from "node:fs";
import { ESLint, type Rule } from "eslint";
import plugin from "../lib/index.js";
import { docsUrl } from "../lib/ruleCreator.js";

// The parts of every rule's `meta` that eslint-doc-generator, ESLint and the
// recommended config read, checked against each other. Whether `fixable` and
// `hasSuggestions` match what a rule reports is left to the rule's own tests:
// RuleTester fails a fix or a suggestion that meta does not declare.

const rules = Object.entries(plugin.rules) as [string, Rule.RuleModule][];
const typeChecked = new Set(
	Object.keys(plugin.ruleConfigs.recommendedTypeChecked).map((rule) => rule.replace(/^obsidianmd\//, "")),
);

// Object schemas that do not forbid unknown keys, and `default`s, which ESLint
// fills in through Ajv; a rule's defaults belong in meta.defaultOptions.
function schemaProblems(schema: unknown, at: string, problems: string[] = []): string[] {
	if (Array.isArray(schema)) {
		schema.forEach((item, i) => schemaProblems(item, `${at}[${i}]`, problems));
		return problems;
	}
	if (schema === null || typeof schema !== "object") {
		return problems;
	}
	const node = schema as Record<string, unknown>;
	const isObject = node.type === "object" || node.properties !== undefined;
	if (isObject && node.additionalProperties !== false && typeof node.additionalProperties !== "object") {
		problems.push(`${at} allows unknown keys`);
	}
	if ("default" in node) {
		problems.push(`${at} has a default`);
	}
	for (const [key, value] of Object.entries(node)) {
		if (key === "properties" || key === "patternProperties" || key === "definitions") {
			for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
				schemaProblems(child, `${at}.${key}.${name}`, problems);
			}
		} else if (typeof value === "object" && key !== "enum" && key !== "required") {
			schemaProblems(value, `${at}.${key}`, problems);
		}
	}
	return problems;
}

describe("rule meta", () => {
	for (const [id, rule] of rules) {
		describe(id, () => {
			const meta = rule.meta ?? {};
			const slash = id.lastIndexOf("/");

			it("links to its own doc, which exists", () => {
				const url = slash === -1 ? docsUrl(id) : docsUrl(id.slice(slash + 1), id.slice(0, slash));
				assert.strictEqual(meta.docs?.url, url);
				assert.ok(fs.existsSync(`docs/rules/${id}.md`), `docs/rules/${id}.md`);
			});

			it("has a description and a type", () => {
				assert.ok(meta.docs?.description?.trim());
				assert.ok(["problem", "suggestion", "layout"].includes(meta.type ?? ""), String(meta.type));
			});

			it("has a strict schema without defaults", () => {
				assert.ok(meta.schema !== undefined, "meta.schema");
				assert.deepStrictEqual(schemaProblems(meta.schema, "schema"), []);
			});

			it("has default options its schema accepts", async () => {
				const defaults = (meta.defaultOptions ?? (rule as { defaultOptions?: unknown[] }).defaultOptions ?? []) as unknown[];
				const eslint = new ESLint({
					overrideConfigFile: true,
					overrideConfig: [{ files: ["**/*.js"], plugins: { obsidianmd: plugin }, rules: { [`obsidianmd/${id}`]: ["error", ...defaults] } }],
				});
				// ESLint validates a rule's options against its schema here, and throws
				// "Configuration for rule ... is invalid" if they do not fit.
				await eslint.calculateConfigForFile("file.js");
			});

			it("requires type checking exactly when ruleConfigs.recommendedTypeChecked has it", () => {
				const docs = meta.docs as { requiresTypeChecking?: boolean } | undefined;
				assert.strictEqual(docs?.requiresTypeChecking === true, typeChecked.has(id));
			});
		});
	}
});
