import type { ESLint, Linter } from "eslint";
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
import ruleCustomMessage from "./rules/ruleCustomMessage.js";
import noEmptyCatch from "./rules/noEmptyCatch.js";
import noObjectToString from "./rules/noObjectToString.js";
import preferWindowTimers from "./rules/preferWindowTimers.js";
import preferObsidianDebounce from "./rules/preferObsidianDebounce.js";
import preferActiveViewOfType from "./rules/preferActiveViewOfType.js";
import preferProcessFrontMatter from "./rules/preferProcessFrontMatter.js";
import preferStringifyYaml from "./rules/preferStringifyYaml.js";
import useNormalizePath from "./rules/useNormalizePath.js";
import preferEditorApi from "./rules/preferEditorApi.js";
import noObsidianBranding from "./rules/noObsidianBranding.js";
import preferActiveWindow from "./rules/preferActiveWindow.js";
import preferInstanceOf from "./rules/preferInstanceOf.js";
import editorEventPreventDefault from "./rules/editorEventPreventDefault.js";
import { getManifest } from "./manifest.js";
import { ui } from "./rules/ui/index.js";

// --- Import plugins and configs for the recommended config ---
import js from "@eslint/js";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import sdl from "@microsoft/eslint-plugin-sdl";
import importPlugin from "eslint-plugin-import";
import depend from 'eslint-plugin-depend';
import globals from "globals";
import fs from "node:fs";
import path from "node:path";
import { Config, defineConfig, globalIgnores } from "eslint/config";
import type { RuleDefinition, RuleDefinitionTypeOptions, RulesConfig } from "@eslint/core";

interface PackageJson {
    name: string;
    version: string;
}

const manifest = getManifest();
const packageJson = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../package.json"), "utf8")) as PackageJson;

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
        "vault/iterate": vault.iterate,
        "vault/prefer-cached-read": vault.preferCachedRead,
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
        "rule-custom-message": ruleCustomMessage,
        "ui/sentence-case": ui.sentenceCase,
        "ui/sentence-case-json": ui.sentenceCaseJson,
        "ui/sentence-case-locale-module": ui.sentenceCaseLocaleModule,
        "no-empty-catch": noEmptyCatch,
        "no-object-to-string": noObjectToString,
        "prefer-window-timers": preferWindowTimers,
        "prefer-obsidian-debounce": preferObsidianDebounce,
        "prefer-active-view-of-type": preferActiveViewOfType,
        "prefer-process-front-matter": preferProcessFrontMatter,
        "prefer-stringify-yaml": preferStringifyYaml,
        "use-normalize-path": useNormalizePath,
        "prefer-editor-api": preferEditorApi,
        "no-obsidian-branding": noObsidianBranding,
        "prefer-active-window": preferActiveWindow,
        "prefer-instance-of": preferInstanceOf,
        "editor-event-prevent-default": editorEventPreventDefault,
    } as unknown as Record<string, RuleDefinition<RuleDefinitionTypeOptions>>,
    configs: {
        recommended: [] as Config[],
        recommendedWithLocalesEn: [] as Config[]
    }
} satisfies ESLint.Plugin;

const recommendedPluginRulesConfig: RulesConfig = {
    "obsidianmd/commands/no-command-in-command-id": "error",
    "obsidianmd/commands/no-command-in-command-name": "error",
    "obsidianmd/commands/no-default-hotkeys": "error",
    "obsidianmd/commands/no-plugin-id-in-command-id": "error",
    "obsidianmd/commands/no-plugin-name-in-command-name": "error",
    "obsidianmd/settings-tab/no-manual-html-headings": "error",
    "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
    "obsidianmd/vault/iterate": "error",
    "obsidianmd/vault/prefer-cached-read": "warn",
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
    "obsidianmd/no-empty-catch": "error",
    "obsidianmd/no-object-to-string": "error",
    "obsidianmd/prefer-window-timers": "warn",
    "obsidianmd/prefer-obsidian-debounce": "warn",
    "obsidianmd/prefer-active-view-of-type": "warn",
    "obsidianmd/prefer-process-front-matter": "warn",
    "obsidianmd/prefer-stringify-yaml": "warn",
    "obsidianmd/use-normalize-path": "warn",
    "obsidianmd/prefer-editor-api": "warn",
    "obsidianmd/no-obsidian-branding": "error",
    "obsidianmd/prefer-active-window": "warn",
    "obsidianmd/prefer-instance-of": "warn",
    "obsidianmd/editor-event-prevent-default": "warn",
}

const flatRecommendedGeneralRules: RulesConfig = {
    "no-unused-vars": "off",
    "no-prototype-bultins": "off",
    "no-self-compare": "warn",
    "no-eval": "error",
    "no-implied-eval": "error",
    "prefer-const": "off",
    "no-implicit-globals": "error",
    "no-var": "error",
    "prefer-object-has-own": "error",
    "@typescript-eslint/no-require-imports": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-this-alias": "error",
    "@typescript-eslint/unbound-method": ["warn", { ignoreStatic: true }],
    "no-console": "off", // overridden by obsidianmd/rule-custom-message
    "no-restricted-globals": [
        "error",
        {
            name: "app",
            message:
                "Avoid using the global app object. Instead use the reference provided by your plugin instance.",
        },
        {
            name: "alert",
            message:
                "Don't use native dialogs. Use Obsidian's Modal API or Notice instead.",
        },
        {
            name: "confirm",
            message:
                "Don't use native dialogs. Use Obsidian's Modal API instead.",
        },
        {
            name: "prompt",
            message:
                "Don't use native dialogs. Use Obsidian's Modal API instead.",
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
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-explicit-any": [
        "error",
        { fixToUnknown: true },
    ],
    "@microsoft/sdl/no-document-write": "error",
    "@microsoft/sdl/no-inner-html": "error",
    "import/no-nodejs-modules":
        manifest && manifest.isDesktopOnly ? "off" : "error",
    "import/no-extraneous-dependencies": "error",
    "obsidianmd/rule-custom-message": [
        "error",
        {
            "no-console": {
                messages: {
                    "Unexpected console statement. Only these console methods are allowed: warn, error, debug.": "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                },
                options: [{ allow: ["warn", "error", "debug"] }],
            }
        }
    ]
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
            import: importPlugin,
            "@microsoft/sdl": sdl,
            depend
        },
        files: ['**/*.js', "**/*.jsx"],
        extends: tseslint.configs.recommended as Config[],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedPluginRulesConfig
        }
    },
    {
        plugins: {
            import: importPlugin,
            "@microsoft/sdl": sdl,
            depend
        },
        files: ['**/*.ts', "**/*.tsx"],
        extends: tseslint.configs.recommendedTypeChecked as Config[],
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

const hybridRecommendedConfig: Config[] = defineConfig({
    rules: recommendedPluginRulesConfig,
    extends: flatRecommendedConfig
});

const recommendedWithLocalesEnBase: Config[] = defineConfig([
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

const recommendedWithLocalesEn: Config[] = defineConfig({
    rules: recommendedPluginRulesConfig,
    extends: recommendedWithLocalesEnBase
});

plugin.configs = {
    recommended: hybridRecommendedConfig,
    recommendedWithLocalesEn
};

export default plugin;
