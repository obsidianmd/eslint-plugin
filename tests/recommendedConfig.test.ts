import assert from "node:assert";
import { ESLint } from "eslint";
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
