import assert from "node:assert";
import { ESLint } from "eslint";
import plugin from "../lib/index.js";

// Tests run in Node or a DOM emulation, not inside Obsidian, so the recommended
// config switches off the rules about code that runs in Obsidian for them. In
// real plugins most of these rules' findings came from test files.

// The rules, with their severity for every other file.
const OBSIDIAN_RUNTIME_RULES: Record<string, string> = {
	"obsidianmd/hardcoded-config-path": "warn",
	"obsidianmd/no-forbidden-elements": "error",
	"obsidianmd/no-global-this": "warn",
	"obsidianmd/no-nodejs-modules": "warn",
	"obsidianmd/no-static-styles-assignment": "error",
	"obsidianmd/no-tfile-tfolder-cast": "warn",
	"obsidianmd/no-unsupported-api": "error",
	"obsidianmd/platform": "error",
	"obsidianmd/prefer-active-doc": "warn",
	"obsidianmd/prefer-create-el": "warn",
	"obsidianmd/prefer-file-manager-trash-file": "warn",
	"obsidianmd/prefer-get-language": "warn",
	"obsidianmd/prefer-instanceof": "warn",
	"obsidianmd/prefer-window-timers": "warn",
	"obsidianmd/regex-lookbehind": "error",
};

// rule-custom-message runs no-console and no-new-func; test and tooling files
// get it with no-new-func alone.
const CUSTOM_MESSAGE = "obsidianmd/rule-custom-message";

// A file path is all it takes to match the test block, so it must never be a
// way around these.
const STILL_ENFORCED = {
	"no-eval": "error",
	"no-unsanitized/method": "error",
	"no-unsanitized/property": "error",
	"@microsoft/sdl/no-inner-html": "warn",
	[CUSTOM_MESSAGE]: "error",
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
	// Test runners' setup files and test helpers, as in the 0.5.0 sweep: fit and
	// journals vitest.setup.ts, dragger and obsidian-icon-folder src/test-setup.ts,
	// obsidian-mindmap-nextgen integration/global-setup.ts, journals
	// src/infrastructure/host/obsidian.testing.ts, obsidian-another-quick-switcher
	// src/ui/test-helpers/, obsidian-full-calendar test_helpers/.
	"vitest.setup.ts",
	"jest.setup.js",
	"src/test-setup.ts",
	"src/setupTests.ts",
	"integration/global-setup.ts",
	"src/demo-vault-global-setup.ts",
	"src/infrastructure/host/obsidian.testing.ts",
	"src/ui/test-helpers/obsidian-dom-stub.ts",
	"test_helpers/MockVault.ts",
	"src/test-support/obsidian.ts",
	"src/test-utils/render.tsx",
	"src/test_utils/fixtures.js",
];

// Build, test and lint tool configs and scripts, which never run in Obsidian,
// named as the community scanner leaves them out.
const TOOLING_FILES = [
	"eslint.config.mjs",
	"eslint.config.mts",
	"packages/plugin/eslint.config.js",
	".eslintrc.js",
	".eslintrc.cjs",
	".prettierrc.mjs",
	"vite.config.ts",
	"vitest.config.mts",
	"vitest.integration.config.ts",
	"jest.config.mjs",
	"rollup.config.js",
	"svelte.config.js",
	"babel.config.cjs",
	"prettier.config.mjs",
	"stylelint.config.cjs",
	"webpack.config.mts",
	"esbuild.config.mjs",
	"esbuild.config.ts",
	"esbuild.externals.mjs",
	"version-bump.mjs",
	"scripts/release.ts",
	"scripts/build/esbuild.config.ts",
	"packages/plugin/scripts/copy.js",
];

// Names that only look like tests or tooling keep every rule. `e2ee` is
// end-to-end encryption, which is plugin code; gym-log-setup.ts is a command
// (atomic-tracker), and src/testing/ (metadata-menu) may hold code that runs
// in Obsidian.
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
	"src/commands/gym-log-setup.ts",
	"src/setup.ts",
	"src/testing/runner.ts",
	"src/config.ts",
	"src/settings.config.ts",
	"src/settings/config.ts",
	"src/editor.config.json.ts",
	"src/esbuildHelpers.ts",
	"src/manuscript/index.ts",
	"src/tools/api.ts",
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

		for (const filename of [...TEST_FILES, ...TOOLING_FILES]) {
			it(`switches off the Obsidian-runtime rules for ${filename}`, async () => {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const rule of Object.keys(OBSIDIAN_RUNTIME_RULES)) {
					assert.strictEqual(getSeverity(rules[rule] ?? "off"), "off", rule);
				}
			});

			it(`keeps the security rules, and no-new-func without no-console, for ${filename}`, async () => {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const [rule, severity] of Object.entries(STILL_ENFORCED)) {
					assert.strictEqual(getSeverity(rules[rule]), severity, rule);
				}
				assert.deepStrictEqual(Object.keys((rules[CUSTOM_MESSAGE] as unknown[])[1] as object), ["no-new-func"]);
			});
		}

		// Every other rule, with its options, applies to test and tooling files as
		// to the rest of the plugin; the Obsidian-runtime rules are left out, not
		// set to "off", and rule-custom-message keeps only no-new-func, with the
		// same options.
		for (const extension of ["ts", "cts", "mts", "tsx", "js", "cjs", "mjs", "jsx"]) {
			it(`leaves out exactly the Obsidian-runtime rules for .${extension} test and tooling files`, async () => {
				const { rules: plain = {} } = await eslint.calculateConfigForFile(`src/main.${extension}`);
				const [severity, customMessages] = plain[CUSTOM_MESSAGE] as [unknown, Record<string, unknown>];
				const expected = {
					...Object.fromEntries(Object.entries(plain).filter(([rule]) => !(rule in OBSIDIAN_RUNTIME_RULES))),
					[CUSTOM_MESSAGE]: [severity, { "no-new-func": customMessages["no-new-func"] }],
				};
				for (const filename of [`src/main.test.${extension}`, `tests/helpers.${extension}`, `scripts/build.${extension}`]) {
					const { rules = {} } = await eslint.calculateConfigForFile(filename);
					assert.deepStrictEqual(rules, expected, filename);
				}
			});
		}

		it("gives other files rule-custom-message with no-console and no-new-func", async () => {
			for (const filename of [...NOT_TEST_FILES, "src/indexer.worker.ts"]) {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				assert.deepStrictEqual(Object.keys((rules[CUSTOM_MESSAGE] as unknown[])[1] as object).sort(), ["no-console", "no-new-func"], filename);
			}
		});

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
		"el.style.color = \"red\";",
		"const link = document.createElement(\"link\");",
		"const mac = navigator.platform.includes(\"Mac\");",
		"const lang = localStorage.getItem(\"language\");",
		"console.log(\"fixture ready\");",
		"export const fixture = { fs, root, el, price, link, mac, lang };",
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

	it("reports none of the Obsidian-runtime rules in a tool config or a script", async () => {
		for (const filePath of ["eslint.config.mjs", "vite.config.js", "scripts/release.js"]) {
			const [result] = await eslint.lintText(code, { filePath });
			assert.deepStrictEqual(
				result.messages.filter((message) => message.ruleId?.startsWith("obsidianmd/")).map((message) => message.ruleId),
				[],
				filePath,
			);
		}
	});

	it("still reports eval and the Function constructor in a test file or a script", async () => {
		for (const filePath of ["tests/fixture.js", "scripts/release.js"]) {
			const [result] = await eslint.lintText("eval(\"1\");\nexport const f = new Function(\"return 1\");\n", { filePath });
			assert.deepStrictEqual(
				result.messages.filter((message) => message.ruleId === "no-eval" || message.ruleId === "obsidianmd/rule-custom-message")
					.map((message) => `${message.line}: ${message.message}`),
				[
					"1: eval can be harmful.",
					"2: [no-new-func] Using the `Function` constructor is dangerous because it executes arbitrary code, similar to `eval()`",
				],
				filePath,
			);
		}
	});

	it("reports the same code outside a test file", async () => {
		const [result] = await eslint.lintText(code, { filePath: "src/fixture.js" });
		assert.deepStrictEqual(
			[...new Set(result.messages.map((message) => message.ruleId).filter((id) => id?.startsWith("obsidianmd/")))].sort(),
			[
				"obsidianmd/hardcoded-config-path",
				"obsidianmd/no-forbidden-elements",
				"obsidianmd/no-global-this",
				"obsidianmd/no-nodejs-modules",
				"obsidianmd/no-static-styles-assignment",
				"obsidianmd/platform",
				"obsidianmd/prefer-active-doc",
				"obsidianmd/prefer-get-language",
				"obsidianmd/prefer-window-timers",
				"obsidianmd/regex-lookbehind",
				"obsidianmd/rule-custom-message",
			],
		);
	});
});
