import assert from "node:assert";
import { ESLint } from "eslint";
import plugin from "../lib/index.js";

// Web worker code runs without a window, so the recommended config switches off
// the rules whose fix needs one (#171). Their autofixes rewrote `globalThis` to
// `window` and `setTimeout` to `window.setTimeout`, which breaks a worker.

const WINDOW_ONLY_RULES = [
	"obsidianmd/no-global-this",
	"obsidianmd/prefer-active-doc",
	"obsidianmd/prefer-create-el",
	"obsidianmd/prefer-instanceof",
	"obsidianmd/prefer-window-timers",
];

// A file path is all it takes to match the worker block, so it must never be a
// way around these.
const STILL_ENFORCED = {
	"no-eval": "error",
	"no-unsanitized/method": "error",
	"no-unsanitized/property": "error",
	"@microsoft/sdl/no-inner-html": "warn",
	"obsidianmd/no-forbidden-elements": "error",
	"obsidianmd/no-nodejs-modules": "warn",
	"obsidianmd/regex-lookbehind": "error",
	"obsidianmd/rule-custom-message": "error",
};

const WORKER_FILES = [
	"src/workers/shims.ts",
	"src/workers/nested/helper.js",
	"src/embedding.worker.ts",
	"src/indexer.worker.mjs",
];

function getSeverity(ruleValue: unknown): string {
	const value = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
	return ({ 0: "off", 1: "warn", 2: "error" } as Record<string, string>)[String(value)] ?? String(value);
}

for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
	describe(`worker files (${configName})`, () => {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: plugin.configs[configName],
		});

		for (const filename of WORKER_FILES) {
			it(`switches off the window-only rules for ${filename}`, async () => {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				for (const rule of WINDOW_ONLY_RULES) {
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

		it("declares worker globals for worker files", async () => {
			const { languageOptions } = await eslint.calculateConfigForFile("src/workers/shims.ts");
			assert.ok(languageOptions?.globals && "importScripts" in languageOptions.globals);
		});

		it("leaves the window-only rules on for other files", async () => {
			for (const filename of ["src/main.ts", "src/workerManager.ts", "src/view.js"]) {
				const { rules = {} } = await eslint.calculateConfigForFile(filename);
				assert.strictEqual(getSeverity(rules["obsidianmd/no-global-this"]), "warn", filename);
				assert.strictEqual(getSeverity(rules["obsidianmd/prefer-window-timers"]), "warn", filename);
			}
		});
	});
}

describe("linting a worker file", () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: plugin.configs.recommended,
	});

	it("reports nothing for globalThis, timers and worker globals", async () => {
		const code = [
			"const scope = globalThis;",
			"importScripts(\"lib.js\");",
			"scope.addEventListener(\"message\", () => {",
			"    setTimeout(() => postMessage(\"done\"), 0);",
			"});",
			"",
		].join("\n");
		const [result] = await eslint.lintText(code, { filePath: "src/workers/embed.worker.js" });
		assert.deepStrictEqual(
			result.messages.map((message) => `${message.ruleId}: ${message.message}`),
			[],
		);
	});

	it("still reports the same code outside a worker file", async () => {
		const [result] = await eslint.lintText("const scope = globalThis;\nsetTimeout(() => scope, 0);\n", {
			filePath: "src/main.js",
		});
		assert.deepStrictEqual(
			result.messages.map((message) => message.ruleId).sort(),
			["obsidianmd/no-global-this", "obsidianmd/prefer-window-timers"],
		);
	});
});
