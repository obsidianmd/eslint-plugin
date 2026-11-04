import assert from "node:assert";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import json from "@eslint/json";
import { ESLint, type Linter } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import tseslint from "typescript-eslint";
import plugin from "../lib/index.js";

async function rulesFor(configName: keyof typeof plugin.configs, filename: string): Promise<Record<string, any>> {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: plugin.configs[configName],
	});
	const cfg = await eslint.calculateConfigForFile(filename);
	return cfg.rules ?? {};
}

function getSeverity(ruleValue: any): string {
	if (typeof ruleValue === "string") return ruleValue;
	if (Array.isArray(ruleValue)) {
		if (typeof ruleValue[0] === "string") return ruleValue[0];
		if (ruleValue[0] === 0) return "off";
		if (ruleValue[0] === 1) return "warn";
		if (ruleValue[0] === 2) return "error";
	}
	if (ruleValue === 0) return "off";
	if (ruleValue === 1) return "warn";
	if (ruleValue === 2) return "error";
	return String(ruleValue);
}

const VALID_SEVERITIES = new Set(["off", "warn", "error"]);

// Exhaustive list of obsidianmd rules that call getParserServices.
// If you add a rule that uses getParserServices, add it here.
// These rules MUST be in recommendedPluginRulesConfigTypeChecked (TS only),
// NOT in recommendedPluginRulesConfigBase (which also applies to JS).
const TYPE_CHECKED_RULES = [
	"obsidianmd/no-plugin-as-component",
	"obsidianmd/no-view-references-in-plugin",
	"obsidianmd/no-unsupported-api",
	"obsidianmd/prefer-create-el",
	"obsidianmd/prefer-file-manager-trash-file",
	"obsidianmd/prefer-instanceof",
	"obsidianmd/no-misused-promises",
];

describe("recommended config", () => {
	it("should be exported as a non-empty array", () => {
		assert.ok(Array.isArray(plugin.configs.recommended));
		assert.ok(plugin.configs.recommended.length > 0);
	});

	it("should be spreadable into a flat config array", () => {
		const config = [...plugin.configs.recommended];
		assert.ok(config.length > 0);
	});

	describe("structure", () => {
		let tsRules: Record<string, any>;
		let jsRules: Record<string, any>;

		before(async () => {
			tsRules = await rulesFor("recommended", "src/main.ts");
			jsRules = await rulesFor("recommended", "src/main.js");
		});

		it("should resolve rules for .ts files", () => {
			assert.ok(Object.keys(tsRules).length > 0, "should have rules for .ts files");
		});

		it("should resolve rules for .js files", () => {
			assert.ok(Object.keys(jsRules).length > 0, "should have rules for .js files");
		});

		it("should have valid severities for all resolved rules", () => {
			for (const [rule, value] of Object.entries(tsRules)) {
				const severity = getSeverity(value);
				assert.ok(
					VALID_SEVERITIES.has(severity),
					`${rule} has invalid severity: ${severity}`
				);
			}
		});

		it("every registered obsidianmd rule should appear in the .ts config", () => {
			const fileSpecificRules = new Set([
				"obsidianmd/ui/sentence-case-json",
				"obsidianmd/ui/sentence-case-locale-module",
				// Scoped to manifest.json, which can never match a JS/TS glob.
				// Asserted separately in "file-scoped rules" below.
				"obsidianmd/validate-manifest",
				// Scoped to LICENSE, which can never match a JS/TS glob.
				// Asserted separately in "file-scoped rules" below.
				"obsidianmd/validate-license",
			]);
			const registeredRules = Object.keys(plugin.rules);
			for (const rule of registeredRules) {
				const prefixed = `obsidianmd/${rule}`;
				if (fileSpecificRules.has(prefixed)) continue;
				assert.ok(
					prefixed in tsRules,
					`registered rule ${prefixed} is not referenced in the recommended config for .ts files`
				);
			}
		});

		it("type-checked rules should not appear in JS config", () => {
			for (const rule of TYPE_CHECKED_RULES) {
				assert.ok(
					!(rule in jsRules),
					`type-checked rule ${rule} should NOT be in the JS config (would crash without type info)`
				);
			}
		});

		it("type-checked rules should appear in TS config", () => {
			for (const rule of TYPE_CHECKED_RULES) {
				assert.ok(
					rule in tsRules,
					`type-checked rule ${rule} should be in the TS config`
				);
			}
		});

		it("base rules should appear in both JS and TS configs", () => {
			const baseRules = [
				"obsidianmd/commands/no-command-in-command-id",
				"obsidianmd/detach-leaves",
				"obsidianmd/no-forbidden-elements",
				"obsidianmd/no-global-this",
				"obsidianmd/prefer-active-doc",
				"obsidianmd/prefer-window-timers",
			];
			for (const rule of baseRules) {
				assert.ok(
					rule in jsRules,
					`base rule ${rule} should be in the JS config`
				);
				assert.ok(
					rule in tsRules,
					`base rule ${rule} should be in the TS config`
				);
			}
		});
	});
});

describe("recommendedWithLocalesEn config", () => {
	it("should be exported as a non-empty array", () => {
		assert.ok(Array.isArray(plugin.configs.recommendedWithLocalesEn));
		assert.ok(plugin.configs.recommendedWithLocalesEn.length > 0);
	});

	describe("structure", () => {
		let tsRules: Record<string, any>;
		let jsRules: Record<string, any>;
		let enJsonRules: Record<string, any>;
		let enTsRules: Record<string, any>;

		before(async () => {
			tsRules = await rulesFor("recommendedWithLocalesEn", "src/main.ts");
			jsRules = await rulesFor("recommendedWithLocalesEn", "src/main.js");
			enJsonRules = await rulesFor("recommendedWithLocalesEn", "locales/en.json");
			enTsRules = await rulesFor("recommendedWithLocalesEn", "locales/en.ts");
		});

		it("sentence-case-json should be 'warn' for en.json files", () => {
			assert.strictEqual(
				getSeverity(enJsonRules["obsidianmd/ui/sentence-case-json"]),
				"warn"
			);
		});

		it("sentence-case-locale-module should be 'warn' for en.ts files", () => {
			assert.strictEqual(
				getSeverity(enTsRules["obsidianmd/ui/sentence-case-locale-module"]),
				"warn"
			);
		});

		it("sentence-case-json should be off or absent for non-en files", () => {
			const severity = getSeverity(tsRules["obsidianmd/ui/sentence-case-json"]);
			assert.ok(
				severity === "off" || !("obsidianmd/ui/sentence-case-json" in tsRules),
				`sentence-case-json should be off or absent for non-en files, got: ${severity}`
			);
		});

		it("type-checked rules should not appear in JS config", () => {
			for (const rule of TYPE_CHECKED_RULES) {
				assert.ok(
					!(rule in jsRules),
					`type-checked rule ${rule} should NOT be in the JS config for recommendedWithLocalesEn`
				);
			}
		});

		it("type-checked rules should appear in TS config", () => {
			for (const rule of TYPE_CHECKED_RULES) {
				assert.ok(
					rule in tsRules,
					`type-checked rule ${rule} should be in the TS config for recommendedWithLocalesEn`
				);
			}
		});
	});
});

// Regression guard for the defect these tests did not catch: validate-manifest
// used to live in the block spread into the JS and TS globs, so no manifest.json
// could ever match and the rule never ran. Resolving the config for the file the
// rule actually targets is the only assertion that notices.
describe("file-scoped rules", () => {
	for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
		describe(configName, () => {
			let manifestRules: Record<string, any>;
			let tsRules: Record<string, any>;

			before(async () => {
				manifestRules = await rulesFor(configName, "manifest.json");
				tsRules = await rulesFor(configName, "src/main.ts");
			});

			it("validate-manifest should be 'warn' for manifest.json", () => {
				assert.strictEqual(
					getSeverity(manifestRules["obsidianmd/validate-manifest"]),
					"warn"
				);
			});

			it("validate-manifest should not apply to source files", () => {
				const rule = "obsidianmd/validate-manifest";
				const severity = getSeverity(tsRules[rule]);
				assert.ok(
					severity === "off" || !(rule in tsRules),
					`${rule} targets a non-source file but is enabled for .ts, got: ${severity}`
				);
			});
		});
	}
});

// Regression guard for the defect these tests did not catch: validate-license
// used to live in the block spread into the JS and TS globs, so no LICENSE could
// ever match and the rule never ran. Resolving the config for the file the rule
// actually targets is the only assertion that notices.
describe("file-scoped rules (LICENSE)", () => {
	for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
		describe(configName, () => {
			let tsRules: Record<string, any>;

			before(async () => {
				tsRules = await rulesFor(configName, "src/main.ts");
			});

			for (const filename of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
				it(`validate-license should be 'warn' for ${filename}`, async () => {
					const licenseRules = await rulesFor(configName, filename);
					assert.strictEqual(
						getSeverity(licenseRules["obsidianmd/validate-license"]),
						"warn"
					);
				});
			}

			it("validate-license should not apply to source files", () => {
				const rule = "obsidianmd/validate-license";
				const severity = getSeverity(tsRules[rule]);
				assert.ok(
					severity === "off" || !(rule in tsRules),
					`${rule} targets a non-source file but is enabled for .ts, got: ${severity}`
				);
			});
		});
	}
});

// LICENSE is read with a `language`, not a `parser`, and that is load-bearing:
// `languageOptions.parser` is merged by key, so a config object that sets a
// parser without restricting its `files` would replace it for every file.
// LICENSE would then reach the TypeScript parser and fail with "was not found
// by the project service because the extension for the file (``) is
// non-standard" -- a fatal error on a file the user never asked to lint.
describe("LICENSE survives a global parser override", () => {
	const withGlobalParser: Linter.Config[] = [
		...(plugin.configs.recommended as Linter.Config[]),
		{
			languageOptions: {
				parser: tseslint.parser,
				parserOptions: {
					projectService: { allowDefaultProject: ["eslint.config.*"] },
				},
			},
		},
	];

	async function lint(filePath: string, code: string) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: withGlobalParser,
		});
		const [result] = await eslint.lintText(code, { filePath });
		return result;
	}

	it("LICENSE is still read by the plain text language", async () => {
		const result = await lint("LICENSE", "Copyright (c) 2020 Dynalist Inc.\n");
		assert.deepStrictEqual(
			result.messages.filter(m => m.fatal).map(m => m.message),
			[],
			"a global parser must not reach LICENSE"
		);
		assert.ok(
			result.messages.some(m => m.ruleId === "obsidianmd/validate-license"),
			"validate-license should still report"
		);
	});
});

// A config object without `files` applies its rules to LICENSE as well, and
// rules written for JavaScript call `sourceCode.getAllComments()` whatever the
// language. Without it on the plain text source code ESLint throws, which
// aborts the whole lint run rather than just this file.
describe("LICENSE survives rules applied to every file", () => {
	const readmeParserOptions: Linter.Config = {
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ["eslint.config.*"] },
			},
		},
	};

	async function lint(extra: Linter.Config) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...(plugin.configs.recommended as Linter.Config[]),
				readmeParserOptions,
				extra,
			],
		});
		const [result] = await eslint.lintText(
			"Copyright (c) 2020 Dynalist Inc.\n",
			{ filePath: "LICENSE" }
		);
		return result;
	}

	for (const [name, extra] of [
		// eslint-comments' own flat config, which carries no `files`.
		["eslint-comments recommended", comments.recommended as Linter.Config],
		// Re-applies the core JS rules to every file; the recommended config
		// scopes them to JS and TS.
		["js recommended re-applied", js.configs.recommended],
	] as const) {
		it(`with ${name}`, async () => {
			const result = await lint(extra);
			assert.deepStrictEqual(
				result.messages.filter(m => m.fatal).map(m => m.message),
				[]
			);
			assert.ok(
				result.messages.some(m => m.ruleId === "obsidianmd/validate-license"),
				"validate-license should still report"
			);
		});
	}
});

// The block docs/configuration.md tells users to add for a licence file under
// another name.
describe("validate-license on a user-configured filename", () => {
	it("reports on COPYING", async () => {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...(plugin.configs.recommended as Linter.Config[]),
				{
					files: ["COPYING"],
					language: "obsidianmd/plain-text",
					rules: {
						"obsidianmd/validate-license": "warn",
					},
				},
			],
		});
		const [result] = await eslint.lintText(
			"Copyright (c) 2020 Dynalist Inc.\n",
			{ filePath: "COPYING" }
		);
		assert.deepStrictEqual(
			result.messages.map(m => m.messageId),
			["unchangedYear", "unchangedCopyright"]
		);
	});
});

describe("scanner-aligned severities", () => {
	let tsRules: Record<string, any>;
	let jsRules: Record<string, any>;

	before(async () => {
		tsRules = await rulesFor("recommended", "src/main.ts");
		jsRules = await rulesFor("recommended", "src/main.js");
	});

	it("security rules should be at error", () => {
		const securityRules = [
			"no-eval",
			"no-unsanitized/method",
			"no-unsanitized/property",
		];
		for (const rule of securityRules) {
			assert.strictEqual(
				getSeverity(tsRules[rule]),
				"error",
				`security rule ${rule} should be 'error'`
			);
		}
	});

	// typescript-eslint's rule replaces the core one in TypeScript files (see
	// impliedEval.test.ts).
	it("implied eval should be at error", () => {
		assert.strictEqual(getSeverity(tsRules["@typescript-eslint/no-implied-eval"]), "error");
		assert.strictEqual(getSeverity(jsRules["no-implied-eval"]), "error");
	});

	it("scanner-escalated obsidianmd rules should be at error", () => {
		const escalatedRules = [
			"obsidianmd/detach-leaves",
			"obsidianmd/platform",
			"obsidianmd/sample-names",
			"obsidianmd/no-sample-code",
			"obsidianmd/no-static-styles-assignment",
			"obsidianmd/settings-tab/no-manual-html-headings",
			"obsidianmd/settings-tab/no-problematic-settings-headings",
			"obsidianmd/no-forbidden-elements",
			"obsidianmd/regex-lookbehind",
		];
		for (const rule of escalatedRules) {
			assert.strictEqual(
				getSeverity(tsRules[rule]),
				"error",
				`scanner-escalated rule ${rule} should be 'error'`
			);
		}
	});

	it("scanner-escalated type-checked rules should be at error", () => {
		const escalatedTypeChecked = [
			"obsidianmd/no-plugin-as-component",
			"obsidianmd/no-view-references-in-plugin",
			"obsidianmd/no-unsupported-api",
		];
		for (const rule of escalatedTypeChecked) {
			assert.strictEqual(
				getSeverity(tsRules[rule]),
				"error",
				`scanner-escalated type-checked rule ${rule} should be 'error'`
			);
		}
	});

	it("non-escalated obsidianmd rules should be at warn", () => {
		const warnRules = [
			"obsidianmd/commands/no-command-in-command-id",
			"obsidianmd/commands/no-command-in-command-name",
			"obsidianmd/commands/no-default-hotkeys",
			"obsidianmd/commands/no-plugin-id-in-command-id",
			"obsidianmd/commands/no-plugin-name-in-command-name",
			"obsidianmd/settings-tab/require-display",
			"obsidianmd/vault/iterate",
			"obsidianmd/editor-drop-paste",
			"obsidianmd/hardcoded-config-path",
			"obsidianmd/no-global-this",
			"obsidianmd/no-tfile-tfolder-cast",
			"obsidianmd/object-assign",
			"obsidianmd/prefer-get-language",
			"obsidianmd/prefer-abstract-input-suggest",
			"obsidianmd/prefer-active-doc",
			"obsidianmd/prefer-window-timers",
		];
		for (const rule of warnRules) {
			assert.strictEqual(
				getSeverity(jsRules[rule]),
				"warn",
				`non-escalated rule ${rule} should be 'warn'`
			);
		}
	});

	it("ui/sentence-case should be off for both TS and JS", () => {
		// Off since 0.3.0 decided it reports too much ordinary text to be on by
		// default; plugins opt in themselves.
		assert.strictEqual(getSeverity(tsRules["obsidianmd/ui/sentence-case"]), "off");
		assert.strictEqual(getSeverity(jsRules["obsidianmd/ui/sentence-case"]), "off");
	});

	it("no-nodejs-modules should be at warn for both TS and JS", () => {
		// The rule reads the manifest's isDesktopOnly itself, so the config no
		// longer switches it off; manifestFallback.test.ts covers a desktop-only manifest.
		assert.strictEqual(getSeverity(tsRules["obsidianmd/no-nodejs-modules"]), "warn");
		assert.strictEqual(getSeverity(jsRules["obsidianmd/no-nodejs-modules"]), "warn");
	});

	it("non-escalated type-checked rules should be at warn", () => {
		const warnTypeChecked = [
			"obsidianmd/prefer-create-el",
			"obsidianmd/prefer-instanceof",
			"@typescript-eslint/no-deprecated",
		];
		for (const rule of warnTypeChecked) {
			assert.strictEqual(
				getSeverity(tsRules[rule]),
				"warn",
				`non-escalated type-checked rule ${rule} should be 'warn'`
			);
		}
	});

	it("eslint-comments rules should be at error", () => {
		const eslintCommentsRules = [
			"eslint-comments/no-unlimited-disable",
			"eslint-comments/require-description",
			"eslint-comments/disable-enable-pair",
			"eslint-comments/no-restricted-disable",
		];
		for (const rule of eslintCommentsRules) {
			assert.strictEqual(
				getSeverity(tsRules[rule]),
				"error",
				`eslint-comments rule ${rule} should be 'error'`
			);
		}
	});

	it("rule-custom-message should be at error", () => {
		assert.strictEqual(
			getSeverity(tsRules["obsidianmd/rule-custom-message"]),
			"error",
			"rule-custom-message should be 'error'"
		);
	});
});

describe("type-checked rule guard", () => {
	let jsRules: Record<string, any>;
	let tsRules: Record<string, any>;

	before(async () => {
		jsRules = await rulesFor("recommended", "src/main.js");
		tsRules = await rulesFor("recommended", "src/main.ts");
	});

	it("type-requiring rules must not appear in JS config", () => {
		for (const rule of TYPE_CHECKED_RULES) {
			assert.ok(
				!(rule in jsRules),
				`${rule} requires type info (getParserServices) but appears in JS config — move it to recommendedPluginRulesConfigTypeChecked only`
			);
		}
	});

	it("type-requiring rules must appear in TS config", () => {
		for (const rule of TYPE_CHECKED_RULES) {
			assert.ok(
				rule in tsRules,
				`${rule} requires type info but is missing from TS config — add it to recommendedPluginRulesConfigTypeChecked`
			);
		}
	});
});

// The README's own setup ends with a global block that sets parser options
// without restricting `files`. manifest.json is read with the `json/json`
// language, which a global `languageOptions.parser` cannot replace; if the block
// used a parser instead, the TypeScript parser would reach manifest.json and
// fail fatally.
describe("manifest.json survives a global parser override", () => {
	async function lint(filePath: string, code: string) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...plugin.configs.recommended,
				{
					languageOptions: {
						parser: tseslint.parser,
						parserOptions: {
							projectService: { allowDefaultProject: ["eslint.config.*"] },
						},
					},
				},
			],
		});
		const [result] = await eslint.lintText(code, { filePath });
		return result;
	}

	it("manifest.json is still read by the JSON language", async () => {
		const result = await lint("manifest.json", '{ "id": "sample-plugin" }\n');
		assert.deepStrictEqual(
			result.messages.filter(m => m.fatal).map(m => m.message),
			[],
			"a global parser must not reach manifest.json"
		);
		assert.ok(
			result.messages.some(m => m.ruleId === "obsidianmd/validate-manifest"),
			"validate-manifest should still report"
		);
	});
});

// English JSON locale files are strict JSON. Under recommendedWithLocalesEn they
// used to fall to the default JS parser, which fails on every one of them with
// "Unexpected token :", so sentence-case-json never ran on a real file.
describe("English JSON locale files", () => {
	const localePaths = [
		"en.json",
		"en-US.json",
		"locales/en.json",
		"src/lang/en_GB.json",
		"src/lang/en/common.json",
	];

	for (const filePath of localePaths) {
		it(`${filePath} is read with the JSON language and checked`, async () => {
			const eslint = new ESLint({
				overrideConfigFile: true,
				overrideConfig: plugin.configs.recommendedWithLocalesEn,
			});
			const config = await eslint.calculateConfigForFile(filePath);
			assert.strictEqual(config.language, json.languages.json);
			assert.strictEqual(
				getSeverity(config.rules["obsidianmd/ui/sentence-case-json"]),
				"warn"
			);
		});
	}

	async function lint(extra: Linter.Config[], fix = false) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...(plugin.configs.recommendedWithLocalesEn as Linter.Config[]),
				...extra,
			],
			fix,
		});
		const [result] = await eslint.lintText('{ "open": "Open Settings" }\n', {
			filePath: "locales/en.json",
		});
		return result;
	}

	it("reports a value that is not in sentence case", async () => {
		const result = await lint([]);
		assert.deepStrictEqual(
			result.messages.map(m => m.ruleId),
			["obsidianmd/ui/sentence-case-json"]
		);
	});

	it("autofixes it when allowAutoFix is on", async () => {
		const result = await lint(
			[{ files: ["**/en.json"], rules: { "obsidianmd/ui/sentence-case-json": ["warn", { allowAutoFix: true }] } }],
			true
		);
		assert.strictEqual(result.output, '{ "open": "Open settings" }\n');
	});

	it("survives a global parser override", async () => {
		const result = await lint([
			{
				languageOptions: {
					parser: tseslint.parser,
					parserOptions: {
						projectService: { allowDefaultProject: ["eslint.config.*"] },
					},
				},
			},
		]);
		assert.deepStrictEqual(
			result.messages.filter(m => m.fatal).map(m => m.message),
			[],
			"a global parser must not reach locale JSON"
		);
		assert.ok(
			result.messages.some(m => m.ruleId === "obsidianmd/ui/sentence-case-json"),
			"sentence-case-json should still report"
		);
	});
});

// The core JS rules used to sit in a block without `files`, so they reached
// package.json, manifest.json, LICENSE and locale JSON too, where a rule such as
// no-irregular-whitespace throws. They are scoped to JS and TS now.
describe("core JS rules apply only to JS and TS files", () => {
	const coreRules = Object.keys(js.configs.recommended.rules ?? {});

	for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
		describe(configName, () => {
			const nonCode = ["package.json", "manifest.json", "LICENSE"];
			// Only recommendedWithLocalesEn lints locale JSON at all.
			if (configName === "recommendedWithLocalesEn") nonCode.push("locales/en.json");
			for (const filename of nonCode) {
				it(`not to ${filename}`, async () => {
					const rules = await rulesFor(configName, filename);
					assert.deepStrictEqual(coreRules.filter(rule => rule in rules), []);
				});
			}

			for (const filename of ["src/main.ts", "src/main.js"]) {
				it(`still to ${filename}`, async () => {
					const rules = await rulesFor(configName, filename);
					assert.deepStrictEqual(coreRules.filter(rule => !(rule in rules)), []);
				});
			}
		});
	}
});

// The core JS rules are the recommended set of the ESLint that is running, not
// of a bundled @eslint/js: @eslint/js 9 lacks the three rules ESLint 10 added to
// `recommended`, and @eslint/js 10 names two rules ESLint 9.19 does not have.
describe("core JS rules are the installed ESLint's recommended set", () => {
	const majorOf = (version: string) => Number(version.split(".")[0]);

	for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
		describe(configName, () => {
			const coreBlock = plugin.configs[configName].find(
				config => config.rules?.["for-direction"] === "error"
			);
			const coreRules = coreBlock?.rules ?? {};

			it("is scoped to JS and TS files", () => {
				assert.deepStrictEqual(coreBlock?.files, ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"]);
			});

			it("equals @eslint/js's recommended rules for this ESLint major", () => {
				// The comparison only holds for matching majors; bump the
				// @eslint/js devDependency along with eslint.
				assert.strictEqual(majorOf(js.meta.version), majorOf(ESLint.version));
				assert.deepStrictEqual(
					Object.entries(coreRules).sort(),
					Object.entries(js.configs.recommended.rules ?? {}).sort()
				);
			});

			it("holds every rule this ESLint recommends, at error", () => {
				const recommended = [...builtinRules]
					.filter(([, rule]) => !rule.meta?.deprecated && rule.meta?.docs?.recommended === true)
					.map(([ruleId]) => ruleId);
				assert.ok(recommended.length > 0);
				assert.deepStrictEqual(recommended.filter(ruleId => coreRules[ruleId] !== "error"), []);
			});

			it("names only rules this ESLint has, none of them deprecated", () => {
				assert.deepStrictEqual(
					Object.keys(coreRules).filter(ruleId => {
						const rule = builtinRules.get(ruleId);
						return !rule || rule.meta?.deprecated || rule.meta?.docs?.recommended !== true;
					}),
					[]
				);
			});
		});
	}

	// The core block comes first, so the blocks after it still decide these.
	describe("the plugin's own settings still win", () => {
		for (const filename of ["src/main.ts", "src/main.js"]) {
			it(`no-unused-vars is off for ${filename}, replaced by the typescript-eslint rule`, async () => {
				const rules = await rulesFor("recommended", filename);
				assert.strictEqual(getSeverity(rules["no-unused-vars"]), "off");
				assert.strictEqual(getSeverity(rules["@typescript-eslint/no-unused-vars"]), "warn");
			});
		}

		it("typescript-eslint switches off the core rules TypeScript covers, for TS only", async () => {
			const tsRules = await rulesFor("recommended", "src/main.ts");
			const jsRules = await rulesFor("recommended", "src/main.js");
			for (const ruleId of ["constructor-super", "no-redeclare", "no-dupe-keys"]) {
				assert.strictEqual(getSeverity(tsRules[ruleId]), "off", `${ruleId} in TS`);
				assert.strictEqual(getSeverity(jsRules[ruleId]), "error", `${ruleId} in JS`);
			}
		});
	});
});

// A user who lints their other JSON with the JSON language used to get the
// core JS rules on it from the recommended config, and no-irregular-whitespace
// threw, aborting the whole lint run.
describe("a user's own JSON block", () => {
	for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
		it(`lints alongside ${configName}`, async () => {
			const eslint = new ESLint({
				overrideConfigFile: true,
				overrideConfig: [
					...(plugin.configs[configName] as Linter.Config[]),
					{ files: ["**/*.json"], plugins: { json }, language: "json/json" },
				],
			});
			for (const filePath of ["data/other.json", "locales/en.json"]) {
				const [result] = await eslint.lintText('{ "a": "Fine as is" }\n', { filePath });
				assert.deepStrictEqual(
					result.messages.filter(m => m.fatal).map(m => m.message),
					[],
					filePath
				);
			}
		});
	}
});

// Lints `code` through the recommended config as `filePath`. TypeScript files
// get type information from this repo's tsconfig, which includes `file.ts`.
async function lintRecommended(filePath: string, code: string) {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [
			...plugin.configs.recommended,
			{
				files: ["**/*.ts"],
				languageOptions: {
					parserOptions: { project: "./tsconfig.json", tsconfigRootDir: process.cwd() },
				},
			},
		],
	});
	const [result] = await eslint.lintText(code, { filePath });
	assert.deepStrictEqual(result.messages.filter(m => m.fatal).map(m => m.message), []);
	return result.messages;
}

// 0.2.9 turned no-require-imports off and declared `require`; rebase commit
// f088476 dropped both in 0.3.0. obsidianmd/no-nodejs-modules checks require()
// itself and suggests a guarded require() as its fix.
describe("require() in plugin code", () => {
	for (const filePath of ["file.ts", "src/main.js"]) {
		describe(filePath, () => {
			it("no-require-imports is off and require is a readonly global", async () => {
				const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommended });
				const config = await eslint.calculateConfigForFile(filePath);
				assert.strictEqual(getSeverity(config.rules?.["@typescript-eslint/no-require-imports"]), "off");
				assert.strictEqual(config.languageOptions?.globals?.require, "readonly");
			});

			it("a require() call is reported by neither no-require-imports nor no-undef", async () => {
				const messages = await lintRecommended(filePath, 'const x = require("x");\nexport default x;\n');
				assert.deepStrictEqual(
					messages
						.filter(m => m.ruleId === "@typescript-eslint/no-require-imports" || m.ruleId === "no-undef")
						.map(m => m.message),
					[]
				);
			});
		});
	}
});

// 0.2.9 ignored `_`-prefixed caught errors and destructured elements; rebase
// commit f088476 dropped the patterns in 0.3.0. A dead `_x` variable stays
// reported (#199), and function arguments stay covered by args: "none".
describe("underscore-prefixed unused bindings", () => {
	const code = [
		"export function run(pair: [number, number]): number {",
		"\tconst [_first, second] = pair;",
		"\ttry { JSON.parse(\"x\"); } catch (_error) { /* ignored */ }",
		"\treturn second;",
		"}",
		"",
	].join("\n");
	const control = "export function run(): void {\n\tconst unused = 1;\n\ttry { JSON.parse(\"x\"); } catch (error) { /* ignored */ }\n}\n";

	for (const filePath of ["file.ts", "src/main.js"]) {
		// JavaScript has no tuple annotations.
		const source = filePath.endsWith(".js") ? code.replace(": [number, number]): number", ")") : code;
		const controlSource = filePath.endsWith(".js") ? control.replace("(): void", "()") : control;

		it(`are not reported in ${filePath}`, async () => {
			const messages = await lintRecommended(filePath, source);
			assert.deepStrictEqual(
				messages.filter(m => m.ruleId === "@typescript-eslint/no-unused-vars").map(m => m.message),
				[]
			);
		});

		it(`a dead _-prefixed variable is still reported in ${filePath}`, async () => {
			const signature = filePath.endsWith(".js") ? "run()" : "run(): void";
			const messages = await lintRecommended(filePath, `export function ${signature} {\n\tconst _unused = 1;\n}\n`);
			assert.strictEqual(
				messages.filter(m => m.ruleId === "@typescript-eslint/no-unused-vars").length,
				1
			);
		});

		it(`without the underscore are still reported in ${filePath}`, async () => {
			const messages = await lintRecommended(filePath, controlSource);
			assert.strictEqual(
				messages.filter(m => m.ruleId === "@typescript-eslint/no-unused-vars").length,
				2
			);
		});
	}
});

// The config carried a misspelled "no-prototype-bultins": "off" from 2024 until
// 0.5.0, so it never applied. The rule has run at error from
// js.configs.recommended since, with no reports against it, and stays there.
describe("no-prototype-builtins", () => {
	const sources = {
		"file.ts": "export function has(obj: object, k: string): boolean {\n\treturn obj.hasOwnProperty(k);\n}\n",
		"src/main.js": "export function has(obj, k) {\n\treturn obj.hasOwnProperty(k);\n}\n",
	};
	for (const [filePath, code] of Object.entries(sources)) {
		it(`reports obj.hasOwnProperty(k) in ${filePath}`, async () => {
			const messages = await lintRecommended(filePath, code);
			assert.deepStrictEqual(
				messages.filter(m => m.ruleId === "no-prototype-builtins").map(m => m.severity),
				[2]
			);
		});
	}
});

// Obsidian's Setting and BaseComponent declare a chaining `then`, so
// @typescript-eslint/no-misused-promises reports them as promises (#181). The
// recommended config swaps in obsidianmd/no-misused-promises, which ignores
// that declaration only.
describe("no-misused-promises swap", () => {
	let tsRules: Record<string, any>;

	before(async () => {
		tsRules = await rulesFor("recommended", "src/main.ts");
	});

	it("the upstream rule is off and the obsidianmd rule is at error for TS", () => {
		assert.strictEqual(getSeverity(tsRules["@typescript-eslint/no-misused-promises"]), "off");
		assert.strictEqual(getSeverity(tsRules["obsidianmd/no-misused-promises"]), "error");
	});

	it("is not applied to JS files, which have no type information", async () => {
		const jsRules = await rulesFor("recommended", "src/main.js");
		const severity = getSeverity(jsRules["obsidianmd/no-misused-promises"]);
		assert.ok(severity === "off" || !("obsidianmd/no-misused-promises" in jsRules), `got ${severity}`);
	});

	it("ruleConfigs carries no typescript-eslint rule for it", () => {
		for (const preset of Object.values(plugin.ruleConfigs)) {
			assert.ok(!("@typescript-eslint/no-misused-promises" in preset));
		}
	});

	async function lintTs(code: string) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...plugin.configs.recommended,
				{
					languageOptions: {
						parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
					},
				},
			],
		});
		const [result] = await eslint.lintText(code, { filePath: "file.ts" });
		return result.messages;
	}

	it("reports a real promise but not a Setting chain, end to end", async () => {
		const messages = await lintTs(
			[
				'import { Setting } from "obsidian";',
				"declare const el: HTMLElement;",
				'["a"].forEach((name) => new Setting(el).setName(name));',
				'["a"].forEach(async (name) => { await Promise.resolve(name); });',
				"",
			].join("\n")
		);
		assert.deepStrictEqual(messages.filter(m => m.fatal), []);
		assert.deepStrictEqual(
			messages.filter(m => m.ruleId?.endsWith("no-misused-promises")).map(m => [m.ruleId, m.line]),
			[["obsidianmd/no-misused-promises", 4]]
		);
	});

	it("can be disabled inline, unlike the other obsidianmd rules", async () => {
		const messages = await lintTs(
			[
				"// eslint-disable-next-line obsidianmd/no-misused-promises",
				'["a"].forEach(async (name) => { await Promise.resolve(name); });',
				"// eslint-disable-next-line obsidianmd/no-global-this",
				"globalThis.toString();",
				"",
			].join("\n")
		);
		assert.deepStrictEqual(
			messages
				.filter(m => m.ruleId === "eslint-comments/no-restricted-disable")
				.map(m => m.line),
			[3]
		);
		assert.ok(!messages.some(m => m.ruleId === "obsidianmd/no-misused-promises"));
	});
});

// prefer-create-el's fix for document.createElement() drops `document`, while
// prefer-active-doc's activeDocument.createElement() would still be reported by
// prefer-create-el, so only prefer-create-el reports the call. It needs type
// information and runs on TypeScript files only, so prefer-active-doc keeps
// reporting the call in JavaScript.
describe("document.createElement() is reported once", () => {
	async function lint(filePath: string) {
		const eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: [
				...plugin.configs.recommended,
				{
					files: ["**/*.ts"],
					languageOptions: {
						parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
					},
				},
			],
		});
		const code = 'export const el = document.createElement("p");\nexport const body = document.body;\n';
		const [result] = await eslint.lintText(code, { filePath });
		assert.deepStrictEqual(result.messages.filter(m => m.fatal), []);
		return result.messages
			.filter(m => m.ruleId === "obsidianmd/prefer-create-el" || m.ruleId === "obsidianmd/prefer-active-doc")
			.map(m => [m.ruleId, m.line]);
	}

	it("by prefer-create-el in a TypeScript file", async () => {
		assert.deepStrictEqual(await lint("file.ts"), [
			["obsidianmd/prefer-create-el", 1],
			["obsidianmd/prefer-active-doc", 2],
		]);
	});

	it("by prefer-active-doc in a JavaScript file", async () => {
		assert.deepStrictEqual(await lint("src/main.js"), [
			["obsidianmd/prefer-active-doc", 1],
			["obsidianmd/prefer-active-doc", 2],
		]);
	});
});

// typescript-eslint advises turning no-undef off for TypeScript: the compiler
// reports undefined names itself, and no-undef cannot see globals declared in a
// .d.ts or a `declare global` block. JavaScript files keep it.
describe("no-undef", () => {
	for (const filename of ["src/main.ts", "src/view.tsx", "src/a.mts", "src/a.cts"]) {
		it(`is off for ${filename}`, async () => {
			const rules = await rulesFor("recommended", filename);
			assert.strictEqual(getSeverity(rules["no-undef"]), "off");
		});
	}

	for (const filename of ["src/main.js", "src/a.mjs", "src/a.cjs", "src/view.jsx"]) {
		it(`stays at warn for ${filename}`, async () => {
			const rules = await rulesFor("recommended", filename);
			assert.strictEqual(getSeverity(rules["no-undef"]), "warn");
		});
	}

	it("does not report a global declared elsewhere in a TypeScript file", async () => {
		const messages = await lintRecommended("file.ts", "export const id: unknown = __BUILD_ID__;\n");
		assert.deepStrictEqual(messages.filter(m => m.ruleId === "no-undef").map(m => m.message), []);
	});

	it("still reports an undefined name in a JavaScript file", async () => {
		const messages = await lintRecommended("src/main.js", "export const id = __BUILD_ID__;\n");
		assert.deepStrictEqual(
			messages.filter(m => m.ruleId === "no-undef").map(m => m.message),
			["'__BUILD_ID__' is not defined."]
		);
	});
});
