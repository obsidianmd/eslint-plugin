import commands from "./rules/commands.js";
import detachLeaves from "./rules/detachLeaves.js";
import hardcodedConfigPath from "./rules/hardcodedConfigPath.js";
import objectAssign from "./rules/objectAssign.js";
import platform from "./rules/platform.js";
import regexLookbehind from "./rules/regexLookbehind.js";
import sampleNames from "./rules/sampleNames.js";
import settingsTab from "./rules/settingsTab.js";
import vaultIterate from "./rules/vault/iterate.js";
import { manifest } from "./readManifest.js";

export default {
	meta: {
		name: "eslint-plugin-obsidianmd",
		version: "0.0.2",
	},
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
	configs: {
		recommended: {
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:deprecation/recommended",
				"plugin:json-schema-validator/recommended",
			],
			plugins: [
				"@typescript-eslint",
				"import",
				"json-schema-validator",
				"@microsoft/eslint-plugin-sdl",
			],
			rules: {
				"no-unused-vars": "off",
				"no-prototype-bultins": "off",
				"no-self-compare": "warn",
				"no-eval": "error",
				"no-implied-eval": "error",
				"prefer-const": "off",
				"no-implicit-globals": "error",
				"no-console": [
					"warn",
					{
						allow: ["warn", "error", "debug"],
					},
				],
				"no-restricted-globals": [
					"error",
					{
						name: "app",
						message:
							"Avoid using the global app object. Instead use the reference provided by your plugin instance.",
					},
				],
				"no-alert": "error",
				"no-undef": "error",

				"@typescript/eslint-ban-ts-comment": [
					"error",
					{
						"ts-check": false,
						"ts-expect-error": "allow-with-description",
						"ts-ignore": true,
						"ts-nocheck": true,
						minimumDescriptionLength: 10,
					},
				],
				"@typescript-eslint/no-unused-vars": [
					"warn",
					{
						args: "none",
					},
				],
				"@typescript-eslint/ban-ts-comment": "off",
				"@typescript-eslint/await-thenable": "warn",
				"@typescript-eslint/no-invalid-this": "error",
				"@typescript-eslint/no-require-imports": "warn",
				"@typescript-eslint/no-var-requires": "off",
				"@typescript-eslint/no-unnecessary-boolean-literal-compare":
					"warn",
				"@typescript-eslint/no-unsafe-assignment": "off",
				"@typescript-eslint/no-empty-function": "off",
				"@typescript-eslint/prefer-ts-expect-error": "error",

				"@microsoft/sdl/no-document-write": "error",
				"@microsoft/sdl/no-inner-html": "error",

				"import/no-nodejs-modules":
					manifest && manifest.isDesktopOnly ? "off" : "error",
				"import/no-extraneous-dependencies": "error",
				"no-restricted-imports": [
					"error",
					{
						name: "moment",
						message:
							"The 'moment' package is bundled with Obsidian. Please import it from 'obsidian' instead.",
					},
				],

				"obsidianmd/commands": "error",
				"obsidianmd/detach-leaves": "error",
				"obsidianmd/hardcoded-config-path": "error",
				"obsidianmd/no-document-write": "error",
				"obsidianmd/no-inner-html": "error",
				"obsidianmd/object-assign": "error",
				"obsidianmd/platform": "error",
				"obsidianmd/regex-lookbehind": "error",
				"obsidianmd/sample-names": "error",
				"obsidianmd/settings-tab": "error",
				"obsidianmd/vault-iterate": "error",
			},
		},
	},
};
