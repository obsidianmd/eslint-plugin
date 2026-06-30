import type { ESLint } from "eslint";
import { commands } from "./rules/commands/index.js";
import { settingsTab } from "./rules/settingsTab/index.js";
import { vault } from "./rules/vault/index.js";
import detachLeaves from "./rules/detachLeaves.js";
import editorDropPaste from "./rules/editorDropPaste.js";
import hardcodedConfigPath from "./rules/hardcodedConfigPath.js";
import noForbiddenElements from "./rules/noForbiddenElements.js";
import noGlobalThis from "./rules/noGlobalThis.js";
import noSampleCode from "./rules/noSampleCode.js";
import noPluginAsComponent from "./rules/noPluginAsComponent.js";
import noStaticStylesAssignment from "./rules/noStaticStylesAssignment.js";
import noTFileTFolderCast from "./rules/noTFileTFolderCast.js";
import noViewReferencesInPlugin from "./rules/noViewReferencesInPlugin.js";
import objectAssign from "./rules/objectAssign.js";
import platform from "./rules/platform.js";
import preferAbstractInputSuggest from "./rules/preferAbstractInputSuggest.js";
import preferActiveDoc from "./rules/preferActiveDoc.js";
import preferCreateEl from "./rules/preferCreateEl.js";
import preferFileManagerTrashFile from "./rules/preferFileManagerTrashFile.js";
import preferWindowTimers from "./rules/preferWindowTimers.js";
import preferInstanceof from "./rules/preferInstanceof.js";
import preferGetLanguage from "./rules/preferGetLanguage.js";
import regexLookbehind from "./rules/regexLookbehind.js";
import sampleNames from "./rules/sampleNames.js";
import validateManifest from "./rules/validateManifest.js";
import validateLicense from "./rules/validateLicense.js";
import ruleCustomMessage from "./rules/ruleCustomMessage.js";
import noNodejsModules from "./rules/noNodejsModules.js";
import noUnsupportedApi from "./rules/noUnsupportedApi.js";
import { getManifest } from "./manifest.js";
import { ui } from "./rules/ui/index.js";

// --- Import plugins and configs for the recommended config ---
import js from "@eslint/js";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import sdl from "@microsoft/eslint-plugin-sdl";
import * as importPlugin from "eslint-plugin-import";
import depend from 'eslint-plugin-depend';
import globals from "globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Config, defineConfig } from "eslint/config";
import type { RuleDefinition, RuleDefinitionTypeOptions, RulesConfig } from "@eslint/core";
import noUnsanitizedPlugin from "eslint-plugin-no-unsanitized";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

interface PackageJson {
    name: string;
    version: string;
}

const manifest = getManifest();
// fileURLToPath handles file:// URLs correctly on all platforms (including Windows),
// unlike new URL().pathname which yields /C:/... on Windows.
const currentDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
// Resolve package.json from both possible locations: the path differs between
// source layout (../package.json) and build output (../../package.json).
const packageJsonPath = fs.existsSync(path.join(currentDir, "../../package.json"))
    ? path.join(currentDir, "../../package.json")
    : path.join(currentDir, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageJson;

const plugin = {
    meta: {
        name: packageJson.name,
        version: packageJson.version,
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
        "settings-tab/require-display": settingsTab.requireDisplay,
        "settings-tab/prefer-setting-definitions":
            settingsTab.preferSettingDefinitions,
        "settings-tab/prefer-update-over-display":
            settingsTab.preferUpdateOverDisplay,
        "settings-tab/no-deprecated-display":
            settingsTab.noDeprecatedDisplay,
        "vault/iterate": vault.iterate,
        "detach-leaves": detachLeaves,
        "editor-drop-paste": editorDropPaste,
        "hardcoded-config-path": hardcodedConfigPath,
        "no-forbidden-elements": noForbiddenElements,
        "no-global-this": noGlobalThis,
        "no-plugin-as-component": noPluginAsComponent,
        "no-sample-code": noSampleCode,
        "no-tfile-tfolder-cast": noTFileTFolderCast,
        "no-view-references-in-plugin": noViewReferencesInPlugin,
        "no-static-styles-assignment": noStaticStylesAssignment,
        "object-assign": objectAssign,
        platform: platform,
        "prefer-abstract-input-suggest": preferAbstractInputSuggest,
        "prefer-active-doc": preferActiveDoc,
        "prefer-create-el": preferCreateEl,
        "prefer-file-manager-trash-file": preferFileManagerTrashFile,
        "prefer-instanceof": preferInstanceof,
        "prefer-window-timers": preferWindowTimers,
        "prefer-get-language": preferGetLanguage,
        "regex-lookbehind": regexLookbehind,
        "sample-names": sampleNames,
        "validate-manifest": validateManifest,
        "validate-license": validateLicense,
        "rule-custom-message": ruleCustomMessage,
        "no-nodejs-modules": noNodejsModules,
        "no-unsupported-api": noUnsupportedApi,
        "ui/sentence-case": ui.sentenceCase,
        "ui/sentence-case-json": ui.sentenceCaseJson,
        "ui/sentence-case-locale-module": ui.sentenceCaseLocaleModule,
    } as unknown as Record<string, RuleDefinition<RuleDefinitionTypeOptions>>,
    configs: {
        recommended: [] as Config[],
        recommendedWithLocalesEn: [] as Config[]
    }
} satisfies ESLint.Plugin;

// Rules that require type information (call getParserServices).
// These must only run on files linted with type information (the TS block,
// which extends recommendedTypeChecked). Applying them to plain JS files
// throws "you have used a rule which requires type information".
const recommendedPluginRulesConfigTypeChecked: RulesConfig = {
    "obsidianmd/no-plugin-as-component": "error",
    "obsidianmd/no-view-references-in-plugin": "error",
    "obsidianmd/no-unsupported-api": "error",
    "obsidianmd/prefer-create-el": "warn",
    "obsidianmd/prefer-file-manager-trash-file": "warn",
    "obsidianmd/prefer-instanceof": "warn",
    "@typescript-eslint/no-deprecated": "warn",
};

const recommendedPluginRulesConfigBase: RulesConfig = {
    "obsidianmd/commands/no-command-in-command-id": "warn",
    "obsidianmd/commands/no-command-in-command-name": "warn",
    "obsidianmd/commands/no-default-hotkeys": "warn",
    "obsidianmd/commands/no-plugin-id-in-command-id": "warn",
    "obsidianmd/commands/no-plugin-name-in-command-name": "warn",
    "obsidianmd/settings-tab/no-manual-html-headings": "error",
    "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
    "obsidianmd/settings-tab/require-display": "warn",
    "obsidianmd/settings-tab/prefer-setting-definitions": "warn",
    "obsidianmd/settings-tab/prefer-update-over-display": "warn",
    "obsidianmd/settings-tab/no-deprecated-display": "warn",
    "obsidianmd/vault/iterate": "warn",
    "obsidianmd/detach-leaves": "error",
    "obsidianmd/editor-drop-paste": "warn",
    "obsidianmd/hardcoded-config-path": "warn",
    "obsidianmd/no-forbidden-elements": "error",
    "obsidianmd/no-global-this": "warn",
    "obsidianmd/no-sample-code": "error",
    "obsidianmd/no-tfile-tfolder-cast": "warn",
    "obsidianmd/no-static-styles-assignment": "error",
    "obsidianmd/object-assign": "warn",
    "obsidianmd/platform": "error",
    "obsidianmd/prefer-get-language": "warn",
    "obsidianmd/prefer-abstract-input-suggest": "warn",
    "obsidianmd/prefer-window-timers": "warn",
    "obsidianmd/prefer-active-doc": "off",
    "obsidianmd/regex-lookbehind": "error",
    "obsidianmd/sample-names": "error",
    "obsidianmd/validate-manifest": "warn",
    "obsidianmd/validate-license": ["warn"],
    "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }],
}

// Combined rules for TypeScript files
const recommendedPluginRulesConfig: RulesConfig = {
    ...recommendedPluginRulesConfigBase,
    ...recommendedPluginRulesConfigTypeChecked,
};

import { restrictedGlobalsOptions, restrictedImportsOptions, noUnusedExpressionsOptions } from "./ruleOptions.js";

const flatRecommendedGeneralRules: RulesConfig = {
    "no-unused-vars": "off",
    "no-unused-expressions": "off",
    "no-prototype-bultins": "off",
    "no-self-compare": "warn",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "off", // handled by obsidianmd/rule-custom-message
    "prefer-const": "off",
    "no-implicit-globals": "warn",
    "no-console": "off", // overridden by obsidianmd/rule-custom-message
    "no-restricted-globals": ["warn", ...restrictedGlobalsOptions],
    // Use the @typescript-eslint variant so `allowTypeImports` is honored
    // (the core rule has no such option). The base rule must be disabled to
    // avoid double-reporting. See https://github.com/obsidianmd/eslint-plugin/issues/143
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": ["warn", ...restrictedImportsOptions],
    "no-alert": "warn",
    "no-undef": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
    "@typescript-eslint/no-unused-expressions": ["warn", ...noUnusedExpressionsOptions],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-explicit-any": [
        "warn",
        { fixToUnknown: true },
    ],
    "@microsoft/sdl/no-document-write": "warn",
    "@microsoft/sdl/no-inner-html": "warn",
    "obsidianmd/no-nodejs-modules":
        manifest && manifest.isDesktopOnly ? "off" : "warn",
    "import/no-extraneous-dependencies": "warn",
    "obsidianmd/rule-custom-message": [
        "error",
        {
            "no-console": {
                messages: {
                    "Unexpected console statement. Only these console methods are allowed: warn, error, debug.": "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                },
                options: [{ allow: ["warn", "error", "debug"] }],
            },
            "no-new-func": {
                messages: {
                    "The Function constructor is eval": "Using the `Function` constructor is dangerous because it executes arbitrary code, similar to `eval()`",
                },
            },
        }
    ],
    // Security: explicitly enforce no-unsanitized rules at error
    "no-unsanitized/method": "error",
    "no-unsanitized/property": "error",
};

const flatRecommendedConfig: Config[] = defineConfig([
    js.configs.recommended,
    {
        plugins: {
            obsidianmd: plugin
        }
    },
    {
        plugins: {
            import: importPlugin as ESLint.Plugin,
            "@microsoft/sdl": sdl,
            depend,
            noUnsanitizedPlugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{js,cjs,mjs,jsx}'],
        extends: [...(tseslint.configs.recommended as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedPluginRulesConfigBase
        }
    },
    {
        plugins: {
            import: importPlugin as ESLint.Plugin,
            "@microsoft/sdl": sdl,
            depend,
            noUnsanitizedPlugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{ts,cts,mts,tsx}'],
        extends: [...(tseslint.configs.recommendedTypeChecked as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedPluginRulesConfig
        },
    },
    {
        files: ['package.json'],
        language: 'json/json',
        extends: [tseslint.configs.disableTypeChecked as Config],
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
    },
    {
        files: ['**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}'],
        rules: {
            "eslint-comments/no-unlimited-disable": "error",
            "eslint-comments/require-description": "error",
            "eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
            "eslint-comments/no-restricted-disable": [
                "error",
                "obsidianmd/*",
                "no-console",
                "no-restricted-globals",
                "@typescript-eslint/no-restricted-imports",
                "no-alert",
                "@typescript-eslint/no-deprecated",
                "@typescript-eslint/no-explicit-any",
                "@microsoft/sdl/no-document-write",
                "no-eval",
                "@microsoft/sdl/no-inner-html",
                "obsidianmd/no-nodejs-modules",
            ],
        },
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: "error",
            reportUnusedInlineConfigs: "error",
        },
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...(manifest?.isDesktopOnly ? {
                    ...globals.node,
                    NodeJS: "readonly"
                } : {}),
                DomElementInfo: "readonly",
                SvgElementInfo: "readonly",
                activeDocument: "readonly",
                activeWindow: "readonly",
                ajax: "readonly",
                ajaxPromise: "readonly",
                createDiv: "readonly",
                createEl: "readonly",
                createFragment: "readonly",
                createSpan: "readonly",
                createSvg: "readonly",
                fish: "readonly",
                fishAll: "readonly",
                isBoolean: "readonly",
                nextFrame: "readonly",
                ready: "readonly",
                sleep: "readonly"
            }
        },
    }
]);

const recommendedWithLocalesEn: Config[] = defineConfig([
    ...flatRecommendedConfig,
    {
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
    },
    // TS/JS English locale modules
    {
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
    }
]);

plugin.configs = {
    recommended: flatRecommendedConfig,
    recommendedWithLocalesEn
};

export default plugin;
