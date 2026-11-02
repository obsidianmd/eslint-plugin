import assert from "node:assert";
import { ESLint, type Linter } from "eslint";
import tseslint from "typescript-eslint";
import plugin from "../lib/index.js";

// The recommended config lints package.json, manifest.json and LICENSE with
// other languages. A user who enables an obsidianmd rule without `files`, say to
// raise its severity, hands those files to it too. Rules written for JavaScript
// must return no visitors there: a type-aware one would otherwise throw from
// getParserServices() and abort the whole lint run.

// Rules written for other languages, which belong on these files.
const NON_JS_RULES = new Set([
	"obsidianmd/validate-manifest",
	"obsidianmd/validate-license",
	"obsidianmd/ui/sentence-case-json",
]);

const jsRules = Object.keys(plugin.rules)
	.map(rule => `obsidianmd/${rule}`)
	.filter(rule => !NON_JS_RULES.has(rule));

// Severity only, so each rule keeps the options the recommended config gives it.
const everyJsRuleAtError: Linter.Config = {
	rules: Object.fromEntries(jsRules.map(rule => [rule, "error"])),
};

const readmeParserOptions: Linter.Config = {
	languageOptions: {
		parserOptions: {
			projectService: { allowDefaultProject: ["eslint.config.*"] },
		},
	},
};

async function lint(filePath: string, code: string, extra: Linter.Config[] = []) {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [
			...plugin.configs.recommended,
			readmeParserOptions,
			...extra,
			everyJsRuleAtError,
		],
	});
	const [result] = await eslint.lintText(code, { filePath });
	return result.messages;
}

const files: Record<string, string> = {
	"LICENSE": "MIT License\n\nCopyright (c) 2026 Jane Doe\n",
	"manifest.json": JSON.stringify({
		id: "word-tally",
		name: "Word Tally",
		version: "1.0.0",
		minAppVersion: "1.5.0",
		description: "Counts words in the active note.",
		author: "Jane Doe",
		isDesktopOnly: false,
	}),
	"package.json": JSON.stringify({ name: "word-tally", version: "1.0.0" }),
};

describe("obsidianmd JavaScript rules on files in other languages", () => {
	it("include every type-aware obsidianmd rule", () => {
		for (const rule of Object.keys(plugin.ruleConfigs.recommendedTypeChecked)) {
			assert.ok(jsRules.includes(rule), `${rule} is not exercised here`);
		}
	});

	for (const [filePath, code] of Object.entries(files)) {
		it(`enabled without files, do not abort the run on ${filePath}`, async () => {
			const messages = await lint(filePath, code);
			assert.deepStrictEqual(messages.filter(m => m.fatal).map(m => m.message), []);
			assert.deepStrictEqual(
				messages.filter(m => m.ruleId !== null && jsRules.includes(m.ruleId)).map(m => m.ruleId),
				[]
			);
		});
	}

	// JSON5 has unquoted keys, which its AST holds as Identifier nodes: a rule
	// visiting Identifier would otherwise run on `document` or `setTimeout` here.
	it("do not run on a JSON5 manifest's unquoted keys", async () => {
		const messages = await lint(
			"manifest.json",
			"{ id: 'word-tally', document: 'x', setTimeout: 1, globalThis: 2 }\n",
			[{ files: ["manifest.json"], language: "json/json5" }]
		);
		assert.deepStrictEqual(messages.filter(m => m.fatal).map(m => m.message), []);
		assert.deepStrictEqual(
			messages.filter(m => m.ruleId !== null && jsRules.includes(m.ruleId)).map(m => m.ruleId),
			[]
		);
	});

	// The guard is about the language, not about type information: a TypeScript
	// file linted without it still fails loudly, as typescript-eslint's rules do.
	for (const rule of ["obsidianmd/prefer-instanceof", "obsidianmd/no-misused-promises"]) {
		it(`${rule} still requires type information on a TypeScript file`, async () => {
			const eslint = new ESLint({
				overrideConfigFile: true,
				overrideConfig: [
					{
						files: ["**/*.ts"],
						languageOptions: { parser: tseslint.parser },
						plugins: { obsidianmd: plugin },
						rules: { [rule]: "error" },
					},
				],
			});
			await assert.rejects(
				eslint.lintText("export const a = 1;\n", { filePath: "src/main.ts" }),
				/requires type information/
			);
		});
	}
});
