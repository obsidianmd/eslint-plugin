import assert from "node:assert";
import { ESLint } from "eslint";
import plugin from "../lib/index.js";

// Tests run in Node or a DOM emulation, not inside Obsidian, so the recommended
// config switches off the rules about code that runs in Obsidian for them. In
// real plugins most of these rules' findings came from test files.

const OBSIDIAN_RUNTIME_RULES = [
	"obsidianmd/hardcoded-config-path",
	"obsidianmd/no-global-this",
	"obsidianmd/no-nodejs-modules",
	"obsidianmd/no-tfile-tfolder-cast",
	"obsidianmd/prefer-active-doc",
	"obsidianmd/prefer-create-el",
	"obsidianmd/prefer-instanceof",
	"obsidianmd/prefer-window-timers",
];

// A file path is all it takes to match the test block, so it must never be a
// way around these.
const STILL_ENFORCED = {
	"no-eval": "error",
	"no-unsanitized/method": "error",
	"no-unsanitized/property": "error",
	"@microsoft/sdl/no-inner-html": "warn",
	"obsidianmd/no-forbidden-elements": "error",
	"obsidianmd/regex-lookbehind": "error",
	"obsidianmd/rule-custom-message": "error",
};

const TEST_FILES = [
	"src/main.test.ts",
	"src/settings.spec.tsx",
	"src/util.test.mjs",
	"tests/setup.ts",
	"test/helpers/vault.js",
	"src/__tests__/view.tsx",
	"__mocks__/obsidian.ts",
];

// Names that only look like tests keep every rule.
const NOT_TEST_FILES = ["src/main.ts", "src/testing-utils.ts", "src/contest/entry.ts", "src/latest.js"];

function getSeverity(ruleValue: unknown): string {
	const value = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
	return ({ 0: "off", 1: "warn", 2: "error" } as Record<string, string>)[String(value)] ?? String(value);
}

for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
	describe(`test files (${configName})`, () => {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: plugin.configs[configName],
		});

		for (const filename of TEST_FILES) {
			it(`switches off the Obsidian-runtime rules for ${filename}`, async () => {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const rule of OBSIDIAN_RUNTIME_RULES) {
					assert.strictEqual(getSeverity(rules[rule] ?? "off"), "off", rule);
				}
			});

			it(`keeps the security rules for ${filename}`, async () => {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const [rule, severity] of Object.entries(STILL_ENFORCED)) {
					assert.strictEqual(getSeverity(rules[rule]), severity, rule);
				}
			});
		}

		it("leaves the Obsidian-runtime rules on for other files", async () => {
			for (const filename of NOT_TEST_FILES) {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const rule of OBSIDIAN_RUNTIME_RULES) {
					// no-tfile-tfolder-cast, prefer-create-el and prefer-instanceof need type information.
					if (filename.endsWith(".js") && !(rule in rules)) continue;
					assert.strictEqual(getSeverity(rules[rule]), "warn", `${rule} in ${filename}`);
				}
			}
		});

		it("keeps no-nodejs-modules for worker files", async () => {
			const { rules = {} } = await eslint.calculateConfigForFile("src/indexer.worker.ts");
			assert.strictEqual(getSeverity(rules["obsidianmd/no-nodejs-modules"]), "warn");
		});
	});
}

describe("linting a test file", () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: plugin.configs.recommended,
	});

	const code = [
		"import fs from \"node:fs\";",
		"const root = \".obsidian/plugins\";",
		"const el = document.createElement(\"div\");",
		"setTimeout(() => globalThis.dispatchEvent(new Event(\"x\")), 0);",
		"export const fixture = { fs, root, el };",
		"",
	].join("\n");

	it("reports none of the Obsidian-runtime rules", async () => {
		const [result] = await eslint.lintText(code, { filePath: "tests/fixture.js" });
		assert.deepStrictEqual(
			result.messages.filter((message) => message.ruleId?.startsWith("obsidianmd/")).map((message) => message.ruleId),
			[],
		);
	});

	it("still reports eval in a test file", async () => {
		const [result] = await eslint.lintText("eval(\"1\");\n", { filePath: "tests/fixture.js" });
		assert.ok(result.messages.some((message) => message.ruleId === "no-eval"));
	});

	it("reports the same code outside a test file", async () => {
		const [result] = await eslint.lintText(code, { filePath: "src/fixture.js" });
		assert.deepStrictEqual(
			[...new Set(result.messages.map((message) => message.ruleId).filter((id) => id?.startsWith("obsidianmd/")))].sort(),
			[
				"obsidianmd/hardcoded-config-path",
				"obsidianmd/no-global-this",
				"obsidianmd/no-nodejs-modules",
				"obsidianmd/prefer-active-doc",
				"obsidianmd/prefer-window-timers",
			],
		);
	});
});
