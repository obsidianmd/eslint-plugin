import assert from "node:assert";
import plugin from "../lib/index.js";

function resolveRulesForFile(configs: any[], filename: string): Record<string, any> {
	const resolved: Record<string, any> = {};

	for (const config of configs) {
		if (config.files) {
			const patterns: unknown[] = Array.isArray(config.files) ? config.files : [config.files];
			const matches = patterns.some((p: unknown) => {
				if (typeof p !== "string") return false;
				if (p === filename) return true;
				if (p.startsWith("**/") && filename.endsWith(p.slice(3))) return true;
				if (p.startsWith("**/*.") && filename.endsWith(p.slice(4))) return true;
				return false;
			});
			if (!matches) continue;
		}

		if (config.extends) {
			const extendsArr = Array.isArray(config.extends) ? config.extends : [config.extends];
			const extendedRules = resolveRulesForFile(extendsArr, filename);
			Object.assign(resolved, extendedRules);
		}

		if (config.rules) {
			Object.assign(resolved, config.rules);
		}
	}
	return resolved;
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
		const tsRules = resolveRulesForFile(plugin.configs.recommended, "src/main.ts");
		const jsRules = resolveRulesForFile(plugin.configs.recommended, "src/main.js");

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
			const registeredRules = Object.keys(plugin.rules);
			for (const rule of registeredRules) {
				const prefixed = `obsidianmd/${rule}`;
				assert.ok(
					prefixed in tsRules,
					`registered rule ${prefixed} is not referenced in the recommended config for .ts files`
				);
			}
		});

		it("type-aware rules should be referenced in JS config", () => {
			const typeCheckedRules = [
				"obsidianmd/no-plugin-as-component",
				"obsidianmd/no-view-references-in-plugin",
				"obsidianmd/no-unsupported-api",
				"obsidianmd/prefer-file-manager-trash-file",
				"obsidianmd/prefer-instanceof",
			];
			for (const rule of typeCheckedRules) {
				assert.ok(
					rule in jsRules,
					`type-aware rule ${rule} should be referenced in the JS config`
				);
			}
		});

		it("type-checked rules should appear in TS config", () => {
			const typeCheckedRules = [
				"obsidianmd/no-plugin-as-component",
				"obsidianmd/no-view-references-in-plugin",
				"obsidianmd/no-unsupported-api",
				"obsidianmd/prefer-file-manager-trash-file",
				"obsidianmd/prefer-instanceof",
			];
			for (const rule of typeCheckedRules) {
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
				"obsidianmd/prefer-create-el",
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
});
