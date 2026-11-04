import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ESLint, type Linter } from "eslint";
import globals from "globals";
import plugin from "../lib/index.js";
import { isWorkerFile } from "../lib/workerGlobals.js";

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

const EXTENSIONS = ["ts", "cts", "mts", "tsx", "js", "cjs", "mjs", "jsx"];

// Names that only look like worker code keep every rule.
const NOT_WORKER_FILES = ["src/main.ts", "src/workerManager.ts", "src/view.js", "src/worker-utils/pool.ts", "src/worker/view.js"];

// A worker has no window, so these must not be declared for worker files: in a
// JavaScript worker, no-undef reports them rather than letting them fail at
// runtime.
const NOT_IN_WORKERS = [
	"window",
	"document",
	"localStorage",
	"alert",
	"HTMLElement",
	"MutationObserver",
	"activeDocument",
	"activeWindow",
	"createEl",
	"sleep",
];

// Browser globals a worker has as well. globals 14's worker list leaves out
// the first six; Intl is an ECMAScript built-in.
const ALSO_IN_WORKERS = [
	"AbortController",
	"structuredClone",
	"OffscreenCanvas",
	"requestAnimationFrame",
	"EventTarget",
	"DOMException",
	"Intl",
	"fetch",
	"setTimeout",
	"navigator",
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

		// Every other rule applies to worker files as to the rest of the plugin, with
		// the same options; the window-only rules are left out, not set to "off".
		for (const extension of EXTENSIONS) {
			it(`leaves out exactly the window-only rules for .${extension} worker files`, async () => {
				const { rules: plain = {} } = await eslint.calculateConfigForFile(`src/main.${extension}`);
				const expected = Object.fromEntries(Object.entries(plain).filter(([rule]) => !WINDOW_ONLY_RULES.includes(rule)));
				for (const filename of [`src/indexer.worker.${extension}`, `src/workers/nested/helper.${extension}`]) {
					const { rules = {} } = await eslint.calculateConfigForFile(filename);
					assert.deepStrictEqual(rules, expected, filename);
				}
			});
		}

		it("declares worker globals for worker files", async () => {
			const { languageOptions } = await eslint.calculateConfigForFile("src/workers/shims.ts");
			assert.ok(languageOptions?.globals && "importScripts" in languageOptions.globals);
		});

		for (const filename of WORKER_FILES) {
			it(`switches off the browser and Obsidian globals a worker lacks for ${filename}`, async () => {
				const { languageOptions } = await eslint.calculateConfigForFile(filename);
				const declared = languageOptions?.globals ?? {};
				for (const name of NOT_IN_WORKERS) {
					assert.strictEqual(declared[name], "off", name);
				}
			});

			it(`keeps the browser globals a worker also has for ${filename}`, async () => {
				const { languageOptions } = await eslint.calculateConfigForFile(filename);
				const declared = languageOptions?.globals ?? {};
				for (const name of ALSO_IN_WORKERS) {
					assert.ok(name in declared, `${name} is not declared`);
					assert.notStrictEqual(declared[name], "off", name);
				}
			});
		}

		// An oracle independent of the plugin's own list: the globals TypeScript
		// declares for a dedicated worker. A browser global among them that the
		// config switched off would be reported by no-undef in code that works.
		it("keeps every browser global TypeScript's webworker lib declares", async () => {
			const lib = fs.readFileSync(createRequire(import.meta.url).resolve("typescript/lib/lib.webworker.d.ts"), "utf8");
			const workerNames = [...lib.matchAll(/^declare (?:var|function) (\w+)/gm)]
				.map((match) => match[1])
				.filter((name) => Object.hasOwn(globals.browser, name));
			assert.ok(workerNames.length > 50, `only ${workerNames.length} names found`);
			const { languageOptions } = await eslint.calculateConfigForFile("src/workers/shims.js");
			const declared = languageOptions?.globals ?? {};
			assert.deepStrictEqual(workerNames.filter((name) => !(name in declared) || declared[name] === "off"), []);
		});

		it("uses the worker's own values for globals both scopes have", async () => {
			const { languageOptions } = await eslint.calculateConfigForFile("src/workers/shims.js");
			const declared = languageOptions?.globals ?? {};
			// A worker's `self` and `postMessage` are writable; a window's are readonly.
			assert.strictEqual(declared.self, true);
			assert.strictEqual(declared.postMessage, true);
		});

		it("switches off none of the worker's own globals", async () => {
			const { languageOptions } = await eslint.calculateConfigForFile("src/workers/shims.js");
			const declared = languageOptions?.globals ?? {};
			for (const name of Object.keys(globals.worker)) {
				assert.notStrictEqual(declared[name], "off", name);
			}
		});

		it("keeps no-undef off for TypeScript worker files", async () => {
			const { rules = {} } = await eslint.calculateConfigForFile("src/workers/shims.ts");
			assert.strictEqual(getSeverity(rules["no-undef"]), "off");
		});

		it("leaves the browser and Obsidian globals declared for other files", async () => {
			for (const filename of NOT_WORKER_FILES) {
				const { languageOptions } = await eslint.calculateConfigForFile(filename);
				const declared = languageOptions?.globals ?? {};
				for (const name of NOT_IN_WORKERS) {
					assert.ok(name in declared, `${name} is not declared in ${filename}`);
					assert.notStrictEqual(declared[name], "off", `${name} in ${filename}`);
				}
				assert.ok(!("importScripts" in declared), filename);
			}
		});

		it("leaves the window-only rules on for other files", async () => {
			for (const filename of NOT_WORKER_FILES) {
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

	it("reports window, document and Obsidian's helpers in a JavaScript worker", async () => {
		const code = [
			"window.addEventListener(\"message\", () => {});",
			"document.title = \"x\";",
			"createEl(\"div\");",
			"void activeDocument;",
			"",
		].join("\n");
		const [result] = await eslint.lintText(code, { filePath: "src/workers/embed.worker.js" });
		assert.deepStrictEqual(
			result.messages.map((message) => `${message.line}: ${message.ruleId}: ${message.message}`),
			[
				"1: no-undef: 'window' is not defined.",
				"2: no-undef: 'document' is not defined.",
				"3: no-undef: 'createEl' is not defined.",
				"4: no-undef: 'activeDocument' is not defined.",
			],
		);
	});

	it("reports nothing for the browser APIs a worker also has", async () => {
		const code = [
			"const controller = new AbortController();",
			"const canvas = new OffscreenCanvas(1, 1);",
			"const format = new Intl.NumberFormat();",
			"requestAnimationFrame(() => {});",
			"onmessage = (event) => {",
			"    postMessage(structuredClone({ data: event.data, controller, canvas, format }));",
			"    close();",
			"};",
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

// The override docs/configuration.md gives for worker code under another name,
// taken from the docs as written.
describe("worker code under another name, with the docs' override", () => {
	function docsOverride(): Linter.Config {
		const text = fs.readFileSync(new URL("../docs/configuration.md", import.meta.url), "utf8");
		const section = text.slice(text.indexOf("### Web worker files"), text.indexOf("### Test files"));
		const match = /```js\n\/\/ import globals from "globals";\n([\s\S]*?)```/.exec(section);
		assert.ok(match, "no override example under ### Web worker files");
		return new Function("globals", `return (${match[1]});`)(globals) as Linter.Config;
	}

	const override = docsOverride();
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [...plugin.configs.recommended, override],
	});

	it("matches the files it names", () => {
		assert.deepStrictEqual(override.files, ["src/background/**"]);
	});

	it("switches off the window-only rules", async () => {
		const { rules = {} } = await eslint.calculateConfigForFile("src/background/embed.js");
		for (const rule of WINDOW_ONLY_RULES) {
			assert.strictEqual(getSeverity(rules[rule] ?? "off"), "off", rule);
		}
	});

	it("reports window and document, but not the worker's globals, in JavaScript", async () => {
		const code = "importScripts(\"lib.js\");\npostMessage(self.name);\nwindow.focus();\ndocument.title = \"x\";\n";
		const [result] = await eslint.lintText(code, { filePath: "src/background/embed.js" });
		assert.deepStrictEqual(
			result.messages.map((message) => `${message.line}: ${message.ruleId}: ${message.message}`),
			[
				"3: no-undef: 'window' is not defined.",
				"4: no-undef: 'document' is not defined.",
			],
		);
	});
});

// prefer-active-doc offers no suggestion in a worker file even where it is
// enabled there by hand, and tells one by its path as the config does.
describe("isWorkerFile", () => {
	const cwd = process.cwd();
	for (const filename of WORKER_FILES) {
		it(`is true for ${filename}`, () => {
			assert.strictEqual(isWorkerFile(path.join(cwd, filename), cwd), true);
		});
	}
	for (const extension of EXTENSIONS) {
		it(`is true for .${extension} worker files`, () => {
			assert.strictEqual(isWorkerFile(path.join(cwd, `src/indexer.worker.${extension}`), cwd), true);
			assert.strictEqual(isWorkerFile(path.join(cwd, `workers/helper.${extension}`), cwd), true);
		});
	}
	for (const filename of NOT_WORKER_FILES) {
		it(`is false for ${filename}`, () => {
			assert.strictEqual(isWorkerFile(path.join(cwd, filename), cwd), false);
		});
	}
});
