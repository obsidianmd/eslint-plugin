import assert from "node:assert";
import fs from "node:fs";
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

function assertSameRules(presets: Record<string, unknown>, configured: Record<string, Linter.RuleEntry>): void {
	assert.deepStrictEqual(Object.keys(presets).sort(), Object.keys(configured).sort());
	for (const [rule, entry] of Object.entries(presets)) {
		assert.deepStrictEqual(normalize(entry as Linter.RuleEntry), normalize(configured[rule]), rule);
	}
}

// The snippet docs/configuration.md gives for switching every obsidianmd rule
// off, taken from the docs as written.
function docsTurnEverythingOff(): Linter.Config {
	const text = fs.readFileSync(new URL("../docs/configuration.md", import.meta.url), "utf8");
	const section = text.slice(text.indexOf("use `ruleConfigs` to generate the overrides programmatically"));
	const match = /```js\n(\{[\s\S]*?\})\n```/.exec(section);
	assert.ok(match, "no ruleConfigs snippet in docs/configuration.md");
	return new Function("obsidianmd", `return (${match[1]});`)(plugin) as Linter.Config;
}

describe("ruleConfigs", () => {
	it("hold only obsidianmd rules", () => {
		const foreign = [...Object.keys(recommended), ...Object.keys(recommendedTypeChecked)].filter(
			(rule) => !rule.startsWith("obsidianmd/"),
		);
		assert.deepStrictEqual(foreign, []);
	});

	it("recommended is exactly the obsidianmd rules the config sets for a JS file", async () => {
		assertSameRules(recommended, obsidianmdRules(await rulesFor("src/main.js")));
	});

	it("recommended and recommendedTypeChecked are exactly the obsidianmd rules the config sets for a TS file", async () => {
		assertSameRules({ ...recommended, ...recommendedTypeChecked }, obsidianmdRules(await rulesFor("src/main.ts")));
	});

	for (const extension of ["cts", "mts", "tsx"]) {
		it(`are the obsidianmd rules for a .${extension} file too`, async () => {
			assertSameRules({ ...recommended, ...recommendedTypeChecked }, obsidianmdRules(await rulesFor(`src/main.${extension}`)));
		});
	}

	for (const extension of ["cjs", "mjs", "jsx"]) {
		it(`recommended is the obsidianmd rules for a .${extension} file too`, async () => {
			assertSameRules(recommended, obsidianmdRules(await rulesFor(`src/main.${extension}`)));
		});
	}

	it("the docs' turn-everything-off snippet leaves no obsidianmd rule on and every other rule alone", async () => {
		const off = docsTurnEverythingOff();
		assert.deepStrictEqual(off.files, ["scripts/**"]);
		for (const filename of ["scripts/build.ts", "scripts/build.js"]) {
			const before = await rulesFor(filename);
			const after = await rulesFor(filename, [off]);
			assert.ok(Object.keys(obsidianmdRules(before)).length > 0, filename);
			for (const [rule, entry] of Object.entries(after)) {
				if (rule.startsWith("obsidianmd/")) {
					assert.strictEqual(normalize(entry)[0], 0, `${rule} in ${filename}`);
				} else {
					assert.deepStrictEqual(entry, before[rule], `${rule} in ${filename}`);
				}
			}
		}
		assert.strictEqual(normalize((await rulesFor("scripts/build.ts", [off]))["@typescript-eslint/no-deprecated"])[0], 1);
	});
});
