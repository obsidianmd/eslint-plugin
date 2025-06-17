import commands from "./lib/rules/commands.ts";
import detachLeaves from "./lib/rules/detachLeaves.ts";
import hardcodedConfigPath from "./lib/rules/hardcodedConfigPath.ts";
import noPluginAsComponent from "./lib/rules/noPluginAsComponent.ts";
import noTFileTFolderCast from "./lib/rules/noTFileTFolderCast.ts";
import noViewReferencesInPlugin from "./lib/rules/noViewReferencesInPlugin.ts";
import noStaticStylesAssignment from "./lib/rules/noStaticStylesAssignment.ts";
import objectAssign from "./lib/rules/objectAssign.ts";
import platform from "./lib/rules/platform.ts";
import preferFileManagerTrashFile from "./lib/rules/preferFileManagerTrashFile.ts";
import regexLookbehind from "./lib/rules/regexLookbehind.ts";
import sampleNames from "./lib/rules/sampleNames.ts";
import settingsTab from "./lib/rules/settingsTab.ts";
import validateManifest from "./lib/rules/validateManifest.ts";
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
					"no-plugin-as-component": noPluginAsComponent,
					"no-tfile-tfolder-cast": noTFileTFolderCast,
					"no-view-references-in-plugin": noViewReferencesInPlugin,
					"no-static-styles-assignment": noStaticStylesAssignment,
					"object-assign": objectAssign,
					platform: platform,
					"prefer-file-manager-trash": preferFileManagerTrashFile,
					"regex-lookbehind": regexLookbehind,
					"sample-names": sampleNames,
					"settings-tab": settingsTab,
					"validate-manifest": validateManifest,
					"vault-iterate": vaultIterate,
				},
			},
		},
		rules: {
			"obsidianmd/commands": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/hardcoded-config-path": "error",
			"obsidianmd/no-plugin-as-component": "error",
			"obsidianmd/no-tfile-tfolder-cast": "error",
			"obsidianmd/no-view-references-in-plugin": "error",
			"obsidianmd/no-static-styles-assignment": "error",
			"obsidianmd/object-assign": "error",
			"obsidianmd/platform": "error",
			"obsidianmd/prefer-file-manager-trash-file": "warn",
			"obsidianmd/regex-lookbehind": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/settings-tab": "error",
			"obsidianmd/validate-manifest": "error",
			"obsidianmd/vault-iterate": "error",
		},
	},
];
