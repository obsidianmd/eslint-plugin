import assert from "node:assert";
import { ESLint, type Linter } from "eslint";
import plugin from "../lib/index.js";

// `ruleConfigs` are documented as the obsidianmd rules of the recommended
// config, split by whether they need type information. docs/configuration.md
// builds "turn every obsidianmd rule off" from their keys, so a missing rule
// stays on and a foreign one (#90: @typescript-eslint/no-deprecated) is
// switched off with them.

const { recommended, recommendedTypeChecked } = plugin.ruleConfigs;

async function rulesFor(filename: string, extra: Linter.Config[] = []): Promise<Record<string, Linter.RuleEntry>> {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [...plugin.configs.recommended, ...extra],
	});
	const config = await eslint.calculateConfigForFile(filename);
	return config.rules ?? {};
}

function obsidianmdRules(rules: Record<string, Linter.RuleEntry>): Record<string, Linter.RuleEntry> {
	return Object.fromEntries(Object.entries(rules).filter(([rule]) => rule.startsWith("obsidianmd/")));
}

// [severity, ...options], with the severity as a number, as calculateConfigForFile reports it.
function normalize(entry: Linter.RuleEntry): unknown[] {
	const [severity, ...options] = Array.isArray(entry) ? entry : [entry];
	const level = { off: 0, warn: 1, error: 2 }[severity as string] ?? severity;
	return [level, ...options];
}

describe("ruleConfigs", () => {
	it("hold only obsidianmd rules", () => {
		const foreign = [...Object.keys(recommended), ...Object.keys(recommendedTypeChecked)].filter(
			(rule) => !rule.startsWith("obsidianmd/"),
		);
		assert.deepStrictEqual(foreign, []);
	});

	it("recommended is exactly the obsidianmd rules the config sets for a JS file", async () => {
		const configured = obsidianmdRules(await rulesFor("src/main.js"));
		assert.deepStrictEqual(Object.keys(recommended).sort(), Object.keys(configured).sort());
		for (const [rule, entry] of Object.entries(recommended)) {
			assert.deepStrictEqual(normalize(entry as Linter.RuleEntry), normalize(configured[rule]), rule);
		}
	});

	it("recommended and recommendedTypeChecked are exactly the obsidianmd rules the config sets for a TS file", async () => {
		const configured = obsidianmdRules(await rulesFor("src/main.ts"));
		const presets = { ...recommended, ...recommendedTypeChecked };
		assert.deepStrictEqual(Object.keys(presets).sort(), Object.keys(configured).sort());
		for (const [rule, entry] of Object.entries(presets)) {
			assert.deepStrictEqual(normalize(entry as Linter.RuleEntry), normalize(configured[rule]), rule);
		}
	});

	it("the docs' turn-everything-off snippet leaves no obsidianmd rule on and every other rule alone", async () => {
		const off: Linter.Config = {
			files: ["**/*.ts"],
			rules: Object.fromEntries(
				[...Object.keys(recommended), ...Object.keys(recommendedTypeChecked)].map((rule) => [rule, "off"]),
			),
		};
		const before = await rulesFor("src/main.ts");
		const after = await rulesFor("src/main.ts", [off]);
		for (const [rule, entry] of Object.entries(after)) {
			if (rule.startsWith("obsidianmd/")) {
				assert.strictEqual(normalize(entry)[0], 0, rule);
			} else {
				assert.deepStrictEqual(entry, before[rule], rule);
			}
		}
		assert.strictEqual(normalize(after["@typescript-eslint/no-deprecated"])[0], 1);
	});
});
