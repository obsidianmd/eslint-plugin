import commands from "./lib/rules/commands.ts";
import detachLeaves from "./lib/rules/detachLeaves.ts";
import hardcodedConfigPath from "./lib/rules/hardcodedConfigPath.ts";
import objectAssign from "./lib/rules/objectAssign.ts";
import platform from "./lib/rules/platform.ts";
import regexLookbehind from "./lib/rules/regexLookbehind.ts";
import sampleNames from "./lib/rules/sampleNames.ts";
import settingsTab from "./lib/rules/settingsTab.ts";
import vaultIterate from "./lib/rules/vault/iterate.ts";

export default [
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: (await import("@typescript-eslint/parser")).default,
			ecmaVersion: 2020,
			sourceType: "module",
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: {
			obsidianmd: {
				rules: {
					commands: commands,
					"detach-leaves": detachLeaves,
					"hardcoded-config-path": hardcodedConfigPath,
					"object-assign": objectAssign,
					platform: platform,
					"regex-lookbehind": regexLookbehind,
					"sample-names": sampleNames,
					"settings-tab": settingsTab,
					"vault-iterate": vaultIterate,
				},
			},
		},
		rules: {
			"obsidianmd/commands": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/hardcoded-config-path": "error",
			"obsidianmd/object-assign": "error",
			"obsidianmd/platform": "error",
			"obsidianmd/regex-lookbehind": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/settings-tab": "error",
			"obsidianmd/vault-iterate": "error",
		},
	},
];
