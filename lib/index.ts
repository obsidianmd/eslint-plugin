import type { ESLint, Linter } from "eslint";
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
import noMisusedPromises from "./rules/noMisusedPromises.js";
import { getManifest, isManifestDesktopOnly } from "./manifest.js";
import { PlainTextLanguage } from "./plainTextLanguage.js";
import { ui } from "./rules/ui/index.js";
import { browserOnlyGlobalsOff } from "./workerGlobals.js";

// --- Import plugins and configs for the recommended config ---
import { builtinRules } from "eslint/use-at-your-own-risk";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import sdl from "@microsoft/eslint-plugin-sdl";
import * as importPlugin from "eslint-plugin-import";
import depend from 'eslint-plugin-depend';
import globals from "globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Config, defineConfig } from "@eslint/config-helpers";
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

// The plugin's public type. The configs are typed with the user's own ESLint
// (a peer dependency) rather than @eslint/config-helpers, so they fit the
// defineConfig and Linter.Config of whichever ESLint version is installed.
interface ObsidianmdPlugin {
    meta: { name: string; version: string };
    languages: { "plain-text": typeof PlainTextLanguage };
    rules: Record<string, RuleDefinition<RuleDefinitionTypeOptions>>;
    configs: { recommended: Linter.Config[]; recommendedWithLocalesEn: Linter.Config[] };
    ruleConfigs: { recommended: RulesConfig; recommendedTypeChecked: RulesConfig };
}

const plugin: ObsidianmdPlugin = {
    meta: {
        name: packageJson.name,
        version: packageJson.version,
    },
    // A language, not a parser: `languageOptions.parser` is merged by key, so
    // any later config object without a `files` restriction replaces it, and
    // LICENSE then reaches whatever parser that block names. `language` is only
    // replaced by another `language`.
    languages: {
        "plain-text": PlainTextLanguage
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
        "no-misused-promises": noMisusedPromises,
        "ui/sentence-case": ui.sentenceCase,
        "ui/sentence-case-json": ui.sentenceCaseJson,
        "ui/sentence-case-locale-module": ui.sentenceCaseLocaleModule,
    } as unknown as Record<string, RuleDefinition<RuleDefinitionTypeOptions>>,
    configs: {
        recommended: [],
        recommendedWithLocalesEn: []
    },
    ruleConfigs: {
        recommended: {} as RulesConfig,
        recommendedTypeChecked: {} as RulesConfig,
    }
};

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
    "obsidianmd/no-misused-promises": "error",
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
    // The rule resolves the desktop-only signal itself, defaulting to the
    // manifest, so the severity no longer has to be computed here.
    "obsidianmd/no-nodejs-modules": "warn",
    "obsidianmd/no-sample-code": "error",
    "obsidianmd/no-tfile-tfolder-cast": "warn",
    "obsidianmd/no-static-styles-assignment": "error",
    "obsidianmd/object-assign": "warn",
    "obsidianmd/platform": "error",
    "obsidianmd/prefer-get-language": "warn",
    "obsidianmd/prefer-abstract-input-suggest": "warn",
    "obsidianmd/prefer-window-timers": "warn",
    "obsidianmd/prefer-active-doc": "warn",
    "obsidianmd/regex-lookbehind": "error",
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
    "obsidianmd/sample-names": "error",
    // validate-manifest and validate-license are NOT here: they lint
    // manifest.json and LICENSE, neither of which can match the JS/TS globs this
    // block is spread into. They get their own file-scoped blocks below.
    // Off since 0.3.0 decided the rule reports too much ordinary text to be on
    // by default; opt in with ["warn", { enforceCamelCaseLower: true }].
    "obsidianmd/ui/sentence-case": "off",
}

// Rules from other plugins that need type information. Like the type-checked
// obsidianmd rules they only run on TS files, but they are not obsidianmd rules,
// so they stay out of `ruleConfigs`.
const recommendedTypeCheckedGeneralRules: RulesConfig = {
    // Allows caretRangeFromPoint, and SettingTab#display() below minAppVersion 1.13.
    "@typescript-eslint/no-deprecated": ["warn", ...noDeprecatedOptions(manifest)],
    // Obsidian's Setting and BaseComponent declare a chaining `then`, so the
    // upstream rule reports them as promises (#181). obsidianmd/no-misused-promises
    // is the same rule with that declaration ignored, and replaces it.
    "@typescript-eslint/no-misused-promises": "off",
    // TypeScript already reports undefined names, and no-undef cannot see globals
    // declared in a `declare global` block or a .d.ts, so typescript-eslint
    // advises turning it off for TypeScript. JavaScript files keep it.
    "no-undef": "off",
};

// Combined rules for TypeScript files
const recommendedPluginRulesConfig: RulesConfig = {
    ...recommendedPluginRulesConfigBase,
    ...recommendedPluginRulesConfigTypeChecked,
};

// Web worker code runs without a window: `window`, `activeWindow`,
// `activeDocument` and Obsidian's DOM helpers do not exist there, so these
// rules' advice cannot be followed and their autofixes (`globalThis` ->
// `window`, `setTimeout` -> `window.setTimeout`) break it. They apply to every
// JS/TS file except worker code. A file path is all it takes to match
// WORKER_FILES, so no security rule may be listed here.
const WINDOW_ONLY_RULES = new Set([
    "obsidianmd/no-global-this",
    "obsidianmd/prefer-active-doc",
    "obsidianmd/prefer-create-el",
    "obsidianmd/prefer-instanceof",
    "obsidianmd/prefer-window-timers",
]);
const WORKER_FILES = [
    '**/*.worker.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
    '**/workers/**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
];

// The globals Obsidian defines on each window. Worker files get them switched
// off again, like the browser globals.
const obsidianGlobals = {
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
    sleep: "readonly",
} as const;

// Tests run in Node or a DOM emulation, not inside Obsidian, so the rules about
// code that runs in Obsidian do not apply to them: there is no popout window,
// Node.js modules are available, mocks cast to TFile, fixtures name `.obsidian`,
// and the code never runs in an older Obsidian (no-unsupported-api) or on iOS
// before 16.4 (regex-lookbehind). They are the window-only rules plus these. A
// file path is all it takes to match TEST_FILES, so no security rule may be
// listed here; the community scanner does not lint tests at all.
const OBSIDIAN_RUNTIME_RULES = new Set([
    ...WINDOW_ONLY_RULES,
    "obsidianmd/hardcoded-config-path",
    "obsidianmd/no-nodejs-modules",
    "obsidianmd/no-tfile-tfolder-cast",
    "obsidianmd/no-unsupported-api",
    "obsidianmd/regex-lookbehind",
]);
// The test files the community scanner leaves out (its ignores.json), plus the
// end-to-end tests, which drive Obsidian from Node: `e2e/` and `e2e-tests/` hold
// them, `*.e2e.*` names them (wdio-obsidian-service's convention), and
// `wdio.conf.*`, `wdio.<name>.conf.*` and `playwright.config.*` configure their
// runners. Each name is only used for tests; end-to-end encryption code (`e2ee`)
// does not match. These are only ever `ignores`, in blocks that already apply to
// JS and TS files alone.
const TEST_FILES = [
    '**/*.{test,tests,spec,specs,e2e}.*',
    '**/{test,tests,__tests__,mocks,__mocks__,e2e,e2e-tests}/**',
    '**/testUtils*',
    '**/testUtils*/**',
    '{automation,test-vault}/**',
    '**/{wdio.conf,wdio.*.conf,playwright.config}.*',
];

// The rules of `config` that `keep` accepts. The window-only and Obsidian-runtime
// rules go in their own blocks with `ignores` rather than being switched off in
// a worker or test block: an "off" there would read, to anything merging the
// config's rules without regard to `files`, as the rule being off.
function pickRules(config: RulesConfig, keep: (rule: string) => boolean): RulesConfig {
    return Object.fromEntries(Object.entries(config).filter(([rule]) => keep(rule)));
}
const isRuntimeOnly = (rule: string) => OBSIDIAN_RUNTIME_RULES.has(rule);
const isWindowOnly = (rule: string) => WINDOW_ONLY_RULES.has(rule);
const isRuntimeNotWindowOnly = (rule: string) => isRuntimeOnly(rule) && !isWindowOnly(rule);

import { restrictedGlobalsOptions, restrictedImportsOptions, noUnusedExpressionsOptions, noUnusedVarsOptions, noDeprecatedOptions } from "./ruleOptions.js";

const flatRecommendedGeneralRules: RulesConfig = {
    "no-unused-vars": "off",
    "no-unused-expressions": "off",
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
    // obsidianmd/no-nodejs-modules checks require() calls itself, and its fix
    // for a Node module is a Platform.isDesktop-guarded require(), which this
    // blanket ban would report in turn.
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-unused-vars": ["warn", ...noUnusedVarsOptions],
    "@typescript-eslint/no-unused-expressions": ["warn", ...noUnusedExpressionsOptions],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-explicit-any": [
        "warn",
        { fixToUnknown: true },
    ],
    "@microsoft/sdl/no-document-write": "warn",
    "@microsoft/sdl/no-inner-html": "warn",
    "import/no-extraneous-dependencies": "warn",
    // Security: explicitly enforce no-unsanitized rules at error
    "no-unsanitized/method": "error",
    "no-unsanitized/property": "error",
};

// ESLint's recommended core rules, read from the ESLint that is running rather
// than from a copy of @eslint/js. A copy fits one major only: @eslint/js 9
// lacks the rules ESLint 10 added to `recommended`, and @eslint/js 10 names
// rules that ESLint 9.19 does not have ("Could not find rule"). ESLint
// generates `js.configs.recommended` from these same two fields
// (tools/update-eslint-recommended.js), so this is that config for the
// installed version.
const coreRecommendedRules: RulesConfig = Object.fromEntries(
    [...builtinRules]
        .filter(([, rule]) => !rule.meta?.deprecated && rule.meta?.docs?.recommended === true)
        .map(([ruleId]) => [ruleId, "error" as const]),
);

const flatRecommendedConfig: Config[] = defineConfig([
    // Core JS rules are for JS and TS only. Without `files` they reached every
    // other file too -- package.json, manifest.json, LICENSE, locale JSON, and
    // any JSON a user lints -- where a rule like no-irregular-whitespace throws
    // because that source code has no comments to walk.
    {
        files: ['**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}'],
        rules: coreRecommendedRules,
    },
    {
        plugins: {
            obsidianmd: plugin
        }
    },
    {
        plugins: {
            import: importPlugin as ESLint.Plugin,
            "@microsoft/sdl": sdl as ESLint.Plugin,
            depend,
            noUnsanitizedPlugin: noUnsanitizedPlugin as ESLint.Plugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{js,cjs,mjs,jsx}'],
        extends: [...(tseslint.configs.recommended as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...pickRules(recommendedPluginRulesConfigBase, (rule) => !isRuntimeOnly(rule))
        }
    },
    {
        plugins: {
            import: importPlugin as ESLint.Plugin,
            "@microsoft/sdl": sdl as ESLint.Plugin,
            depend,
            noUnsanitizedPlugin: noUnsanitizedPlugin as ESLint.Plugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{ts,cts,mts,tsx}'],
        extends: [...(tseslint.configs.recommendedTypeChecked as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedTypeCheckedGeneralRules,
            ...pickRules(recommendedPluginRulesConfig, (rule) => !isRuntimeOnly(rule))
        },
    },
    {
        files: ['**/*.{js,cjs,mjs,jsx}'],
        ignores: [...WORKER_FILES, ...TEST_FILES],
        rules: pickRules(recommendedPluginRulesConfigBase, isWindowOnly),
    },
    {
        files: ['**/*.{ts,cts,mts,tsx}'],
        ignores: [...WORKER_FILES, ...TEST_FILES],
        rules: pickRules(recommendedPluginRulesConfig, isWindowOnly),
    },
    {
        files: ['**/*.{js,cjs,mjs,jsx}'],
        ignores: TEST_FILES,
        rules: pickRules(recommendedPluginRulesConfigBase, isRuntimeNotWindowOnly),
    },
    {
        files: ['**/*.{ts,cts,mts,tsx}'],
        ignores: TEST_FILES,
        rules: pickRules(recommendedPluginRulesConfig, isRuntimeNotWindowOnly),
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
            "depend/ban-dependencies": [
                "error", {
                    "presets": ["native", "microutilities", "preferred"]
                }
            ]
        }
    },
    // manifest.json is strict JSON, so it needs the JSON language to be parsed
    // at all — under the JS/TS globs above it was never linted.
    {
        files: ['manifest.json'],
        language: 'json/json',
        extends: [tseslint.configs.disableTypeChecked as Config],
        plugins: {
            json,
            obsidianmd: plugin
        },
        rules: {
            "obsidianmd/validate-manifest": "warn"
        }
    },
    // LICENSE has no extension and is not code, so it needs both an explicit
    // glob and a language that can read it.
    {
        files: ['LICENSE', 'LICENSE.md', 'LICENSE.txt'],
        language: 'obsidianmd/plain-text',
        extends: [tseslint.configs.disableTypeChecked as Config],
        plugins: {
            obsidianmd: plugin
        },
        rules: {
            "obsidianmd/validate-license": "warn"
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
                // Disableable like the typescript-eslint rule it replaces.
                "!obsidianmd/no-misused-promises",
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
                require: "readonly",
                ...(isManifestDesktopOnly(manifest) ? {
                    ...globals.node,
                    NodeJS: "readonly"
                } : {}),
                ...obsidianGlobals,
            }
        },
    },
    // After the block above, which gives every file the browser and Obsidian
    // globals: flat config merges `languageOptions.globals`, so worker files
    // would keep them all. A worker has neither, so they are switched off there
    // and its own globals (`self`, `postMessage`, `importScripts`, ...) take
    // their place. no-undef is off for TypeScript, so this is for JavaScript.
    {
        files: WORKER_FILES,
        languageOptions: {
            globals: {
                ...browserOnlyGlobalsOff,
                ...Object.fromEntries(Object.keys(obsidianGlobals).map((name) => [name, "off"])),
                ...globals.worker,
            },
        },
    },
]);

const recommendedWithLocalesEn: Config[] = defineConfig([
    ...flatRecommendedConfig,
    // English JSON locale files are strict JSON, so they need the JSON language
    // to be parsed at all; under a JS parser every one was a fatal error.
    {
        plugins: { json, obsidianmd: plugin },
        language: "json/json",
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
    recommended: flatRecommendedConfig as Linter.Config[],
    recommendedWithLocalesEn: recommendedWithLocalesEn as Linter.Config[]
};

plugin.ruleConfigs = {
    /** Base obsidianmd rules that do not require type information. Safe to use with any parser setup. */
    recommended: recommendedPluginRulesConfigBase,
    /** Obsidianmd rules that require typescript-eslint type-aware linting (recommendedTypeChecked or stricter). */
    recommendedTypeChecked: recommendedPluginRulesConfigTypeChecked,
};

export default plugin;
