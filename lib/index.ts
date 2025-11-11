import type { ESLint } from "eslint";
import { commands } from "./rules/commands/index.js";
import { settingsTab } from "./rules/settingsTab/index.js";
import { vault } from "./rules/vault/index.js";
import detachLeaves from "./rules/detachLeaves.js";
import hardcodedConfigPath from "./rules/hardcodedConfigPath.js";
import noForbiddenElements from "./rules/noForbiddenElements.js";
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
import validateLicense from "./rules/validateLicense.js";
import { manifest } from "./readManifest.js";
import { ui } from "./rules/ui/index.js";

// --- Import plugins and configs for the recommended config ---
import js from "@eslint/js";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import sdl from "@microsoft/eslint-plugin-sdl";
import importPlugin from "eslint-plugin-import";
import depend from 'eslint-plugin-depend';

const plugin: ESLint.Plugin = {
	meta: {
		name: "eslint-plugin-obsidianmd",
		version: "0.1.2",
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
		"no-forbidden-elements": noForbiddenElements,
		"no-plugin-as-component": noPluginAsComponent,
		"no-sample-code": noSampleCode,
		"no-tfile-tfolder-cast": noTFileTFolderCast,
		"no-view-references-in-plugin": noViewReferencesInPlugin,
		"no-static-styles-assignment": noStaticStylesAssignment,
		"object-assign": objectAssign,
		platform: platform,
		"prefer-abstract-input-suggest": preferAbstractInputSuggest,
		"prefer-file-manager-trash-file": preferFileManagerTrashFile,
		"regex-lookbehind": regexLookbehind,
		"sample-names": sampleNames,
		"validate-manifest": validateManifest,
		"validate-license": validateLicense,
		"ui/sentence-case": ui.sentenceCase,
		"ui/sentence-case-json": ui.sentenceCaseJson,
		"ui/sentence-case-locale-module": ui.sentenceCaseLocaleModule,
	} as any,
	configs: {
		recommended: {},
		recommendedWithLocalesEn: {}
	}
};

const recommendedPluginRulesConfig = {
	"obsidianmd/commands/no-command-in-command-id": "error",
	"obsidianmd/commands/no-command-in-command-name": "error",
	"obsidianmd/commands/no-default-hotkeys": "error",
	"obsidianmd/commands/no-plugin-id-in-command-id": "error",
	"obsidianmd/commands/no-plugin-name-in-command-name": "error",
	"obsidianmd/settings-tab/no-manual-html-headings": "error",
	"obsidianmd/settings-tab/no-problematic-settings-headings": "error",
	"obsidianmd/vault/iterate": "error",
	"obsidianmd/detach-leaves": "error",
	"obsidianmd/hardcoded-config-path": "error",
	"obsidianmd/no-forbidden-elements": "error",
	"obsidianmd/no-plugin-as-component": "error",
	"obsidianmd/no-sample-code": "error",
	"obsidianmd/no-tfile-tfolder-cast": "error",
	"obsidianmd/no-view-references-in-plugin": "error",
	"obsidianmd/no-static-styles-assignment": "error",
	"obsidianmd/object-assign": "error",
	"obsidianmd/platform": "error",
	"obsidianmd/prefer-file-manager-trash-file": "warn",
	"obsidianmd/prefer-abstract-input-suggest": "error",
	"obsidianmd/regex-lookbehind": "error",
	"obsidianmd/sample-names": "error",
	"obsidianmd/validate-manifest": "error",
	"obsidianmd/validate-license": ["error"],
    "obsidianmd/ui/sentence-case": ["error", { enforceCamelCaseLower: true }],
}

const flatRecommendedGeneralRules = {
	"no-unused-vars": "off",
	"no-prototype-bultins": "off",
	"no-self-compare": "warn",
	"no-eval": "error",
	"no-implied-eval": "error",
	"prefer-const": "off",
	"no-implicit-globals": "error",
	"no-console": ["error", { allow: ["warn", "error", "debug"] }],
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
		{
			name: "localStorage",
			message: "Prefer `App#saveLocalStorage` / `App#loadLocalStorage` functions to write / read localStorage data that's unique to a vault."
		}
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
			name: "ofetch",
			message:
				"Use the built-in `requestUrl` function instead of `ofetch`.",
		},
		{
			name: "ky",
			message:
				"Use the built-in `requestUrl` function instead of `ky`.",
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
	"@typescript-eslint/ban-ts-comment": "off",
	"@typescript-eslint/no-deprecated": "error",
	"@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
	"@typescript-eslint/require-await": "off",
	"@typescript-eslint/no-explicit-any": [
		"error",
		{ fixToUnknown: true },
	],
	"@microsoft/sdl/no-document-write": "error",
	"@microsoft/sdl/no-inner-html": "error",
	"import/no-nodejs-modules":
		manifest && manifest.isDesktopOnly ? "off" : "error",
	"import/no-extraneous-dependencies": "error",
}

const flatRecommendedConfig = [
	js.configs.recommended,
	{
		plugins: {
			import: importPlugin,
			"@microsoft/sdl": sdl,
			obsidianmd: plugin,
			depend
		},
		files: ['**/*.js', "**/*.jsx"],
		extends: [tseslint.configs.recommended],
		rules: {
			...flatRecommendedGeneralRules,
			...recommendedPluginRulesConfig
		}
	},
	{
		plugins: {
			import: importPlugin,
			"@microsoft/sdl": sdl,
			obsidianmd: plugin,
			depend
		},
		files: ['**/*.ts', "**/*.tsx"],
		extends: [tseslint.configs.recommendedTypeChecked],
		rules: {
			...flatRecommendedGeneralRules,
			...recommendedPluginRulesConfig
		},
	},
	{
		files: ['package.json'],
		language: 'json/json',
		plugins: {
			depend,
			json
		},
		rules: {
			"no-irregular-whitespace": "off",
			"depend/ban-dependencies": [
				"error", {
					"presets": ["native", "microutilities", "preferred"]
				}
				]
		}
	}
	]

const hybridRecommendedConfig = {
	// Properties for eslint-doc-generator to read
	...recommendedPluginRulesConfig,

	// Make the object iterable for the ESLint 9 runtime
	[Symbol.iterator]: function* () {
		yield* flatRecommendedConfig
	},
};

plugin.configs = {
	recommended: hybridRecommendedConfig,
	recommendedWithLocalesEn: {
		...recommendedPluginRulesConfig,
		[Symbol.iterator]: function* () {
			yield* flatRecommendedConfig;
			// JSON English locales
			yield {
				plugins: { obsidianmd: plugin },
				files: [
					"**/en.json",
					"**/en*.json",
					"**/en/*.json",
					"**/en/**/*.json",
				],
				rules: {
					"obsidianmd/ui/sentence-case-json": "warn",
				},
			} as any;
			// TS/JS English locale modules
			yield {
				plugins: { obsidianmd: plugin },
				files: [
					"**/en.ts",
					"**/en.js",
					"**/en.cjs",
					"**/en.mjs",
					"**/en-*.ts",
					"**/en-*.js",
					"**/en-*.cjs",
					"**/en-*.mjs",
					"**/en_*.ts",
					"**/en_*.js",
					"**/en_*.cjs",
					"**/en_*.mjs",
					"**/en/*.ts",
					"**/en/*.js",
					"**/en/*.cjs",
					"**/en/*.mjs",
					"**/en/**/*.ts",
					"**/en/**/*.js",
					"**/en/**/*.cjs",
					"**/en/**/*.mjs",
				],
				rules: {
					"obsidianmd/ui/sentence-case-locale-module": "warn",
				},
			} as any;
		},
	} as any,
} as any;

export default plugin;
