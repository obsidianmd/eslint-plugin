import assert from "node:assert";
import { ESLint } from "eslint";
import plugin from "../lib/index.js";

// Tests run in Node or a DOM emulation, not inside Obsidian, so the recommended
// config switches off the rules about code that runs in Obsidian for them. In
// real plugins most of these rules' findings came from test files.

// The rules, with their severity for every other file.
const OBSIDIAN_RUNTIME_RULES: Record<string, string> = {
	"obsidianmd/hardcoded-config-path": "warn",
	"obsidianmd/no-global-this": "warn",
	"obsidianmd/no-nodejs-modules": "warn",
	"obsidianmd/no-tfile-tfolder-cast": "warn",
	"obsidianmd/no-unsupported-api": "error",
	"obsidianmd/prefer-active-doc": "warn",
	"obsidianmd/prefer-create-el": "warn",
	"obsidianmd/prefer-instanceof": "warn",
	"obsidianmd/prefer-window-timers": "warn",
	"obsidianmd/regex-lookbehind": "error",
};

// A file path is all it takes to match the test block, so it must never be a
// way around these.
const STILL_ENFORCED = {
	"no-eval": "error",
	"no-unsanitized/method": "error",
	"no-unsanitized/property": "error",
	"@microsoft/sdl/no-inner-html": "warn",
	"obsidianmd/no-forbidden-elements": "error",
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
	// End-to-end tests and their runners' configs, all run from Node.
	"e2e/helpers.ts",
	"e2e-tests/helpers.ts",
	"packages/plugin/e2e/specs/smoke.js",
	"src/settings.e2e.ts",
	"vitest.e2e.config.ts",
	"wdio.conf.mts",
	"wdio.mobile.conf.mts",
	"playwright.config.ts",
	// The rest of what the community scanner leaves out as tests.
	"tests/all.tests.ts",
	"eslint.tests.config.mjs",
	"src/view.specs.ts",
	"src/mocks/crypto.ts",
	"src/testUtils.ts",
	"testUtils/fakeElectron.ts",
	"automation/run.ts",
	"test-vault/.obsidian/plugins/hot-reload/main.js",
];

// Names that only look like tests keep every rule. `e2ee` is end-to-end
// encryption, which is plugin code.
const NOT_TEST_FILES = [
	"src/main.ts",
	"src/testing-utils.ts",
	"src/contest/entry.ts",
	"src/latest.js",
	"src/crypto/e2ee.ts",
	"src/e2ee/session.ts",
	"src/e2e-encryption.ts",
	"src/wdio.ts",
	"src/automation/rules.ts",
	"src/test-vault-picker.ts",
	"src/mockup.ts",
];

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
				for (const rule of Object.keys(OBSIDIAN_RUNTIME_RULES)) {
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

		// Every other rule, with its options, applies to test files as to the rest
		// of the plugin; the Obsidian-runtime rules are left out, not set to "off".
		for (const extension of ["ts", "cts", "mts", "tsx", "js", "cjs", "mjs", "jsx"]) {
			it(`leaves out exactly the Obsidian-runtime rules for .${extension} test files`, async () => {
				const { rules: plain = {} } = await eslint.calculateConfigForFile(`src/main.${extension}`);
				const expected = Object.fromEntries(Object.entries(plain).filter(([rule]) => !(rule in OBSIDIAN_RUNTIME_RULES)));
				for (const filename of [`src/main.test.${extension}`, `tests/helpers.${extension}`]) {
					const { rules = {} } = await eslint.calculateConfigForFile(filename);
					assert.deepStrictEqual(rules, expected, filename);
				}
			});
		}

		it("leaves the Obsidian-runtime rules on for other files", async () => {
			for (const filename of NOT_TEST_FILES) {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const [rule, severity] of Object.entries(OBSIDIAN_RUNTIME_RULES)) {
					// no-tfile-tfolder-cast, no-unsupported-api, prefer-create-el and
					// prefer-instanceof need type information.
					if (filename.endsWith(".js") && !(rule in rules)) continue;
					assert.strictEqual(getSeverity(rules[rule]), severity, `${rule} in ${filename}`);
				}
			}
		});

		it("keeps the rules that are not window-only for worker files", async () => {
			const { rules = {} } = await eslint.calculateConfigForFile("src/indexer.worker.ts");
			assert.strictEqual(getSeverity(rules["obsidianmd/no-nodejs-modules"]), "warn");
			assert.strictEqual(getSeverity(rules["obsidianmd/no-unsupported-api"]), "error");
			assert.strictEqual(getSeverity(rules["obsidianmd/regex-lookbehind"]), "error");
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
		"const price = /(?<=\\$)\\d+/;",
		"export const fixture = { fs, root, el, price };",
		"",
	].join("\n");

	it("reports none of the Obsidian-runtime rules", async () => {
		const [result] = await eslint.lintText(code, { filePath: "tests/fixture.js" });
		assert.deepStrictEqual(
			result.messages.filter((message) => message.ruleId?.startsWith("obsidianmd/")).map((message) => message.ruleId),
			[],
		);
	});

	it("reports none of the Obsidian-runtime rules in an end-to-end helper", async () => {
		// A Playwright helper like incremental-reading's e2e-tests/helpers.ts.
		const [result] = await eslint.lintText(code, { filePath: "e2e-tests/helpers.js" });
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
				"obsidianmd/regex-lookbehind",
			],
		);
	});
});
