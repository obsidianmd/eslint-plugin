import { commands } from "./rules/commands/index.js";
import { settingsTab } from "./rules/settingsTab/index.js";
import { vault } from "./rules/vault/index.js";
import detachLeaves from "./rules/detachLeaves.js";
import hardcodedConfigPath from "./rules/hardcodedConfigPath.js";
import noSampleCode from "./rules/noSampleCode.js";
import noPluginAsComponent from "./rules/noPluginAsComponent.js";
import noStaticStylesAssignment from "./rules/noStaticStylesAssignment.js";
import noTFileTFolderCast from "./rules/noTFileTFolderCast.js";
import noViewReferencesInPlugin from "./rules/noViewReferencesInPlugin.js";
import objectAssign from "./rules/objectAssign.js";
import platform from "./rules/platform.js";
import preferAbstractInputSuggest from "./rules/preferAbstractInputSuggest.js";
import preferFileManagerTrashFile from "./rules/preferFileManagerTrashFile.js";
import regexLookbehind from "./rules/regexLookbehind.js";
import sampleNames from "./rules/sampleNames.js";
import validateManifest from "./rules/validateManifest.js";
import vaultIterate from "./rules/vault/iterate.js";
import { manifest } from "./readManifest.js";

export default {
	meta: {
		name: "eslint-plugin-obsidianmd",
		version: "0.0.2",
	},
	rules: {
		"commands/no-command-in-command-id": commands.noCommandInCommandId,
		"commands/no-command-in-command-name": commands.noCommandInCommandName,
		"commands/no-default-hotkeys": commands.noDefaultHotkeys,
		"commands/no-plugin-id-in-command-id": commands.noPluginIdInCommandId,
		"commands/no-plugin-name-in-command-name":
			commands.noPluginNameInCommandName,
		"settings-tab/no-manual-html-headings":
			settingsTab.noManualHtmlHeadings,
		"settings-tab/no-problematic-settings-headings":
			settingsTab.noProblematicSettingsHeadings,
		"vault/iterate": vault.iterate,
		"detach-leaves": detachLeaves,
		"hardcoded-config-path": hardcodedConfigPath,
		"no-plugin-as-component": noPluginAsComponent,
		"no-sample-code": noSampleCode,
		"no-tfile-tfolder-cast": noTFileTFolderCast,
		"no-view-references-in-plugin": noViewReferencesInPlugin,
		"no-static-styles-assignment": noStaticStylesAssignment,
		"object-assign": objectAssign,
		platform: platform,
		"prefer-abstract-input-suggest": preferAbstractInputSuggest,
		"prefer-file-manager-trash": preferFileManagerTrashFile,
		"regex-lookbehind": regexLookbehind,
		"sample-names": sampleNames,
		"settings-tab": settingsTab,
		"validate-manifest": validateManifest,
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
					"warn",
					{
						name: "fetch",
						message:
							"Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian.",
					},
				],
				"no-restricted-imports": [
					"error",
					{
						name: "axios",
						message:
							"Use the built-in `requestUrl` function instead of `axios`.",
					},
					{
						name: "superagent",
						message:
							"Use the built-in `requestUrl` function instead of `superagent`.",
					},
					{
						name: "got",
						message:
							"Use the built-in `requestUrl` function instead of `got`.",
					},
					{
						name: "node-fetch",
						message:
							"Use the built-in `requestUrl` function instead of `node-fetch`.",
					},
					{
						name: "moment",
						message:
							"The 'moment' package is bundled with Obsidian. Please import it from 'obsidian' instead.",
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
				"@typescript-eslint/no-explicit-any": [
					"error",
					{
						// A great option that suggests a safer alternative
						fixToUnknown: true,
					},
				],

				"@microsoft/sdl/no-document-write": "error",
				"@microsoft/sdl/no-inner-html": "error",

				"import/no-nodejs-modules":
					manifest && manifest.isDesktopOnly ? "off" : "error",
				"import/no-extraneous-dependencies": "error",

				"obsidianmd/commands/no-command-in-command-id": "error",
				"obsidianmd/commands/no-command-in-command-name": "error",
				"obsidianmd/commands/no-default-hotkeys": "error",
				"obsidianmd/commands/no-plugin-id-in-command-id": "error",
				"obsidianmd/commands/no-plugin-name-in-command-name": "error",
				"obsidianmd/settings-tab/no-manual-html-headings": "error",
				"obsidianmd/settings-tab/no-problematic-settings-headings":
					"error",
				"obsidianmd/vault/iterate": "error",
				"obsidianmd/detach-leaves": "error",
				"obsidianmd/hardcoded-config-path": "error",
				"obsidianmd/no-plugin-as-component": "error",
				"obsidianmd/no-sample-code": "error",
				"obsidianmd/no-tfile-tfolder-cast": "error",
				"obsidianmd/no-view-references-in-plugin": "error",
				"obsidianmd/no-document-write": "error",
				"obsidianmd/no-inner-html": "error",
				"obsidianmd/no-static-styles-assignment": "error",
				"obsidianmd/object-assign": "error",
				"obsidianmd/platform": "error",
				"obsidianmd/prefer-file-manager-trash-file": "warn",
				"obsidianmd/prefer-abstract-input-suggest": "error",
				"obsidianmd/regex-lookbehind": "error",
				"obsidianmd/sample-names": "error",
				"obsidianmd/settings-tab": "error",
				"obsidianmd/validate-manifest": "error",
				"obsidianmd/vault-iterate": "error",
			},
		},
	},
};
