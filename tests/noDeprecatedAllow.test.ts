import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslint from "typescript-eslint";
import plugin from "../lib/index.js";
import { noDeprecatedOptions } from "../lib/ruleOptions.js";
import type { PluginManifest } from "../lib/types/manifest.js";

// The recommended config runs typescript-eslint's no-deprecated with an allow
// list (#175). Run the rule with exactly the options the config sets, so the
// test follows the config rather than restating it.
type RuleEntry = string | [string, ...unknown[]];

// The entry from the block for TypeScript files: the non-code blocks turn the
// rule off through disableTypeChecked.
function configuredOptions(): unknown[] {
	let entry: RuleEntry | undefined;
	for (const block of plugin.configs.recommended) {
		const value = block.rules?.["@typescript-eslint/no-deprecated"] as RuleEntry | undefined;
		if (value !== undefined && block.files?.includes("**/*.{ts,cts,mts,tsx}")) {
			entry = value;
		}
	}
	return Array.isArray(entry) ? entry.slice(1) : [];
}

function manifestWith(minAppVersion: unknown): PluginManifest {
	return { minAppVersion } as unknown as PluginManifest;
}

const rule = (tseslint.plugin as unknown as { rules: Record<string, Parameters<RuleTester["run"]>[1]> }).rules[
	"no-deprecated"
];
// This repo's manifest.json has minAppVersion 0.15.0.
const options = configuredOptions();
const declarativeOptions = noDeprecatedOptions(manifestWith("1.13.0"));

// SettingTab#display() is `@deprecated Since 1.13.0` in the obsidian typings
// installed here (1.14.4). A tab that overrides display() inherits the tag.
const SETTING_TAB_CALLS = {
	"this.display() in a tab that overrides display()": `
		import { PluginSettingTab } from "obsidian";
		class MyTab extends PluginSettingTab {
			display(): void {}
			refresh(): void { this.display(); }
		}
	`,
	"this.display() in a tab that does not override it": `
		import { PluginSettingTab } from "obsidian";
		class MyTab extends PluginSettingTab {
			refresh(): void { this.display(); }
		}
	`,
	"super.display()": `
		import { PluginSettingTab } from "obsidian";
		class MyTab extends PluginSettingTab {
			display(): void { super.display(); }
		}
	`,
	"display() on a PluginSettingTab from elsewhere": `
		import { PluginSettingTab } from "obsidian";
		declare const tab: PluginSettingTab;
		tab.display();
	`,
};

new RuleTester().run("no-deprecated as configured", rule, {
	valid: [
		{
			name: "caretRangeFromPoint is allowed as the fallback for caretPositionFromPoint",
			code: "document.caretRangeFromPoint(0, 0);",
			options,
		},
		{
			name: "caretRangeFromPoint is allowed on any Document",
			code: "declare const doc: Document;\ndoc.caretRangeFromPoint(0, 0);",
			options,
		},
		...Object.entries(SETTING_TAB_CALLS).map(([name, code]) => ({
			name: `${name} is allowed below minAppVersion 1.13`,
			code,
			options,
		})),
		{
			name: "caretRangeFromPoint stays allowed from minAppVersion 1.13",
			code: "document.caretRangeFromPoint(0, 0);",
			options: declarativeOptions,
		},
	],
	invalid: [
		{
			name: "other deprecated DOM APIs are still reported",
			code: "document.execCommand('copy');",
			options,
			errors: [{ messageId: "deprecatedWithReason" }],
		},
		{
			name: "other deprecated obsidian methods are still reported",
			code: `
				import { Workspace } from "obsidian";
				declare const workspace: Workspace;
				workspace.splitActiveLeaf();
			`,
			options,
			errors: [{ messageId: "deprecatedWithReason" }],
		},
		{
			name: "other deprecated obsidian statics are still reported",
			code: `
				import { Component, MarkdownRenderer } from "obsidian";
				declare const el: HTMLElement;
				declare const component: Component;
				void MarkdownRenderer.renderMarkdown("text", el, "", component);
			`,
			options,
			errors: [{ messageId: "deprecatedWithReason" }],
		},
		...Object.entries(SETTING_TAB_CALLS).map(([name, code]) => ({
			name: `${name} is reported from minAppVersion 1.13`,
			code,
			options: declarativeOptions,
			errors: [{ messageId: "deprecatedWithReason" as const }],
		})),
	],
});

describe("noDeprecatedOptions", () => {
	function allowsDisplay(manifest: PluginManifest | null): boolean {
		const [{ allow }] = noDeprecatedOptions(manifest);
		return allow.some((specifier) => specifier.name === "display");
	}

	it("allows display() when minAppVersion is below 1.13.0", () => {
		assert.strictEqual(allowsDisplay(manifestWith("1.12.7")), true);
		assert.strictEqual(allowsDisplay(manifestWith("0.15.0")), true);
		assert.strictEqual(allowsDisplay(manifestWith("1.13.0-beta.1")), true);
	});

	it("does not allow display() from minAppVersion 1.13.0", () => {
		assert.strictEqual(allowsDisplay(manifestWith("1.13.0")), false);
		assert.strictEqual(allowsDisplay(manifestWith("1.14.4")), false);
	});

	it("allows display() when minAppVersion is unknown or invalid, like the settings-tab rules", () => {
		assert.strictEqual(allowsDisplay(null), true);
		assert.strictEqual(allowsDisplay({} as PluginManifest), true);
		assert.strictEqual(allowsDisplay(manifestWith("latest")), true);
		assert.strictEqual(allowsDisplay(manifestWith(1.13)), true);
	});

	it("always allows caretRangeFromPoint", () => {
		for (const manifest of [null, manifestWith("1.12.7"), manifestWith("1.13.0")]) {
			const [{ allow }] = noDeprecatedOptions(manifest);
			assert.ok(allow.some((specifier) => specifier.name === "caretRangeFromPoint"));
		}
	});
});
