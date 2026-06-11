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
import importPlugin from "eslint-plugin-import";
import depend from 'eslint-plugin-depend';
import globals from "globals";
import fs from "node:fs";
import path from "node:path";
import { Config, defineConfig } from "eslint/config";
import type { RuleDefinition, RuleDefinitionTypeOptions, RulesConfig } from "@eslint/core";
import noUnsanitizedPlugin from "eslint-plugin-no-unsanitized";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

interface PackageJson {
    name: string;
    version: string;
}

const manifest = getManifest();
function findPackageJson(startDir: string): string {
    let dir = startDir;
    while (true) {
        const candidate = path.join(dir, "package.json");
        if (fs.existsSync(candidate)) {
            const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
            if (parsed.name === "eslint-plugin-obsidianmd") return candidate;
        }
        // Stop at .git boundary to avoid walking outside the project
        if (fs.existsSync(path.join(dir, ".git"))) break;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    throw new Error("Could not find eslint-plugin-obsidianmd package.json");
}

const currentDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
const packageJson = JSON.parse(fs.readFileSync(findPackageJson(currentDir), "utf8")) as PackageJson;

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

// Rules that require TypeScript type information (TypeScript-only).
// These must only run on files parsed by @typescript-eslint/parser.
const recommendedPluginRulesConfigTypeChecked: RulesConfig = {
    "obsidianmd/no-plugin-as-component": "error",
    "obsidianmd/no-view-references-in-plugin": "error",
    "obsidianmd/no-unsupported-api": "error",
    "obsidianmd/prefer-file-manager-trash-file": "warn",
    "obsidianmd/prefer-instanceof": "error",
};

const recommendedPluginRulesConfigBase: RulesConfig = {
    "obsidianmd/commands/no-command-in-command-id": "error",
    "obsidianmd/commands/no-command-in-command-name": "error",
    "obsidianmd/commands/no-default-hotkeys": "error",
    "obsidianmd/commands/no-plugin-id-in-command-id": "error",
    "obsidianmd/commands/no-plugin-name-in-command-name": "error",
    "obsidianmd/settings-tab/no-manual-html-headings": "error",
    "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
    "obsidianmd/settings-tab/require-display": "error",
    "obsidianmd/settings-tab/prefer-setting-definitions": "warn",
    "obsidianmd/settings-tab/prefer-update-over-display": "warn",
    "obsidianmd/settings-tab/no-deprecated-display": "warn",
    "obsidianmd/vault/iterate": "error",
    "obsidianmd/detach-leaves": "error",
    "obsidianmd/editor-drop-paste": "error",
    "obsidianmd/hardcoded-config-path": "error",
    "obsidianmd/no-forbidden-elements": "error",
    "obsidianmd/no-global-this": "error",
    "obsidianmd/no-sample-code": "error",
    "obsidianmd/no-tfile-tfolder-cast": "error",
    "obsidianmd/no-static-styles-assignment": "error",
    "obsidianmd/object-assign": "error",
    "obsidianmd/platform": "error",
    "obsidianmd/prefer-get-language": "error",
    "obsidianmd/prefer-abstract-input-suggest": "error",
    "obsidianmd/prefer-create-el": "error",
    "obsidianmd/prefer-window-timers": "error",
    "obsidianmd/prefer-active-doc": "off",
    "obsidianmd/regex-lookbehind": "error",
    "obsidianmd/sample-names": "error",
    "obsidianmd/validate-manifest": "error",
    "obsidianmd/validate-license": ["error"],
    "obsidianmd/ui/sentence-case": ["error", { enforceCamelCaseLower: true }],
    "obsidianmd/ui/sentence-case-json": "off",
    "obsidianmd/ui/sentence-case-locale-module": "off",
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
    "prefer-const": "off",
    "no-implicit-globals": "error",
    "no-console": "off", // overridden by obsidianmd/rule-custom-message
    "no-restricted-globals": ["error", ...restrictedGlobalsOptions],
    "no-restricted-imports": ["error", ...restrictedImportsOptions],
    "no-alert": "error",
    "no-undef": "error",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-deprecated": "error",
    "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
    "@typescript-eslint/no-unused-expressions": ["error", ...noUnusedExpressionsOptions],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-explicit-any": [
        "error",
        { fixToUnknown: true },
    ],
    "@microsoft/sdl/no-document-write": "error",
    "@microsoft/sdl/no-inner-html": "error",
    "obsidianmd/no-nodejs-modules":
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
            depend,
            noUnsanitizedPlugin
        },
        files: ['**/*.js', "**/*.jsx"],
        extends: [...(tseslint.configs.recommended as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedPluginRulesConfigBase
        }
    },
    {
        plugins: {
            import: importPlugin,
            "@microsoft/sdl": sdl,
            depend,
            noUnsanitizedPlugin
        },
        files: ['**/*.ts', "**/*.tsx"],
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

const hybridRecommendedConfig: Config[] = defineConfig([
    ...flatRecommendedConfig,
    // Linter options from scanner's eslint-release layer
    {
        linterOptions: {
            reportUnusedDisableDirectives: "error",
            reportUnusedInlineConfigs: "error",
        },
    },
    // JSON file overrides: disable type-aware rules
    {
        files: ["**/*.json"],
        rules: {
            "obsidianmd/no-plugin-as-component": "off",
            "obsidianmd/no-view-references-in-plugin": "off",
            "obsidianmd/no-unsupported-api": "off",
            "obsidianmd/prefer-file-manager-trash-file": "off",
            "obsidianmd/prefer-instanceof": "off",
        }
    },
    // Main rule overrides for all source files
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "manifest.json"],
        plugins: {
            "eslint-comments": eslintComments,
            obsidianmd: plugin,
        },
        rules: {
            // === Security rules (error) ===
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-unsanitized/method": "error",
            "no-unsanitized/property": "error",
            "obsidianmd/no-forbidden-elements": "error",
            "obsidianmd/regex-lookbehind": "error",

            // === Portal re-escalations (error) ===
            "obsidianmd/settings-tab/no-manual-html-headings": "error",
            "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
            "obsidianmd/sample-names": "error",
            "obsidianmd/no-sample-code": "error",
            "obsidianmd/platform": "error",
            "obsidianmd/no-plugin-as-component": "error",
            "obsidianmd/detach-leaves": "error",
            "obsidianmd/no-static-styles-assignment": "error",
            "obsidianmd/no-view-references-in-plugin": "error",
            "obsidianmd/no-unsupported-api": "error",

            // === Downgraded to warn (from error in base) ===
            "obsidianmd/commands/no-command-in-command-id": "warn",
            "obsidianmd/commands/no-command-in-command-name": "warn",
            "obsidianmd/commands/no-default-hotkeys": "warn",
            "obsidianmd/commands/no-plugin-id-in-command-id": "warn",
            "obsidianmd/commands/no-plugin-name-in-command-name": "warn",
            "obsidianmd/vault/iterate": "warn",
            "obsidianmd/editor-drop-paste": "warn",
            "obsidianmd/hardcoded-config-path": "warn",
            "obsidianmd/no-global-this": "warn",
            "obsidianmd/no-tfile-tfolder-cast": "warn",
            "obsidianmd/object-assign": "warn",
            "obsidianmd/prefer-abstract-input-suggest": "warn",
            "obsidianmd/prefer-get-language": "warn",
            "obsidianmd/prefer-instanceof": "warn",
            "obsidianmd/prefer-window-timers": "warn",
            "obsidianmd/prefer-file-manager-trash-file": "warn",

            // === Always warn (scanner doesn't check manifest.isDesktopOnly) ===
            "obsidianmd/no-nodejs-modules": "warn",

            // === Disabled rules ===
            "obsidianmd/prefer-active-doc": "off",
            "obsidianmd/validate-manifest": "off",
            "obsidianmd/validate-license": "off",
            "obsidianmd/ui/sentence-case": "off",
            "obsidianmd/ui/sentence-case-json": "off",
            "obsidianmd/ui/sentence-case-locale-module": "off",
            "no-undef": "off",
            "no-console": "off",
            "import/no-unresolved": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-base-to-string": "off",

            // === General rules at warn ===
            "no-implicit-globals": "warn",
            "no-alert": "warn",
            "no-self-compare": "warn",
            "no-restricted-globals": ["warn", ...restrictedGlobalsOptions],
            "no-restricted-imports": ["warn", ...restrictedImportsOptions],
            "@typescript-eslint/no-deprecated": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
            "@typescript-eslint/no-unused-expressions": ["warn", ...noUnusedExpressionsOptions],
            "@typescript-eslint/no-explicit-any": ["warn", { fixToUnknown: true }],
            "@microsoft/sdl/no-document-write": "warn",
            "@microsoft/sdl/no-inner-html": "warn",
            "import/no-extraneous-dependencies": "warn",

            // === no-unsafe-* family (warn, re-enabled from off) ===
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",

            // === no-new-func off (replaced by rule-custom-message wrapper) ===
            "no-new-func": "off",

            // === Combined rule-custom-message (no-new-func + no-console) ===
            "obsidianmd/rule-custom-message": [
                "error",
                {
                    "no-new-func": {
                        messages: {
                            "The Function constructor is eval": "Using the `Function` constructor is dangerous because it executes arbitrary code, similar to `eval()`"
                        }
                    },
                    "no-console": {
                        messages: {
                            "Unexpected console statement. Only these console methods are allowed: warn, error, debug.": "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        },
                        options: [{ allow: ["warn", "error", "debug"] }],
                    }
                }
            ],

            // === eslint-comments rules ===
            "eslint-comments/no-unlimited-disable": "error",
            "eslint-comments/require-description": "error",
            "eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
            "eslint-comments/no-restricted-disable": [
                "error",
                "obsidianmd/*",
                "no-console",
                "no-restricted-globals",
                "no-restricted-imports",
                "no-alert",
                "@typescript-eslint/no-deprecated",
                "@typescript-eslint/no-explicit-any",
                "@microsoft/sdl/no-document-write",
                "@microsoft/sdl/no-eval",
                "@microsoft/sdl/no-inner-html",
                "import/no-nodejs-modules",
            ],
        }
    },
    // depend/ban-dependencies at warn for source files (scanner applies to source, not just package.json)
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/package.json"],
        plugins: { depend },
        rules: {
            "depend/ban-dependencies": ["warn", { presets: ["native", "microutilities", "preferred"] }],
        },
    },
]);

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

const recommendedWithLocalesEn: Config[] = defineConfig([
    {
        rules: recommendedPluginRulesConfigBase,
        extends: recommendedWithLocalesEnBase
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: recommendedPluginRulesConfigTypeChecked
    },
]);

plugin.configs = {
    recommended: hybridRecommendedConfig,
    recommendedWithLocalesEn
};

export default plugin;
