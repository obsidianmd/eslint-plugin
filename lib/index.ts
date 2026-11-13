import type { ESLint, Linter } from "eslint";
import { commands } from "./rules/commands/index.js";
import { settingsTab } from "./rules/settingsTab/index.js";
import { vault } from "./rules/vault/index.js";
import detachLeaves from "./rules/detachLeaves.js";
import editorDropPaste from "./rules/editorDropPaste.js";
import hardcodedConfigPath from "./rules/hardcodedConfigPath.js";
import noAwaitChainable from "./rules/noAwaitChainable.js";
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
import { withCustomMessages } from "./customMessages.js";
import { getManifest, isManifestDesktopOnly } from "./manifest.js";
import { PlainTextLanguage } from "./plainTextLanguage.js";
import { readPluginPackageJson } from "./pluginPackageJson.js";
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
import { fileURLToPath } from "node:url";
import { type Config, defineConfig } from "@eslint/config-helpers";
import type { RulesConfig } from "@eslint/core";
import noUnsanitizedPlugin from "eslint-plugin-no-unsanitized";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

const manifest = getManifest();
// package.json is ../package.json from lib/ in the source and ../../package.json
// from dist/lib/ in the build; readPluginPackageJson tells it from a
// package.json above a checkout by its name.
const packageJson = readPluginPackageJson(import.meta.url);
if (!packageJson) {
    throw new Error(`eslint-plugin-obsidianmd: cannot find its own package.json above ${fileURLToPath(import.meta.url)}`);
}

// The plugin's public type. The rules and configs are typed with the user's own
// ESLint (a peer dependency) rather than @eslint/core and
// @eslint/config-helpers, so the plugin fits the ESLint.Plugin, defineConfig
// and Linter.Config of whichever ESLint version is installed. ESLint 9.19 types
// a plugin's rules as Rule.RuleModule, which @eslint/core's RuleDefinition does
// not fit.
interface ObsidianmdPlugin {
    meta: { name: string; version: string };
    languages: { "plain-text": typeof PlainTextLanguage };
    rules: NonNullable<ESLint.Plugin["rules"]>;
    configs: { recommended: Linter.Config[]; recommendedWithLocalesEn: Linter.Config[] };
    ruleConfigs: { recommended: RulesConfig; recommendedTypeChecked: RulesConfig };
    // ESLint ignores the keys of a plugin object it does not use, and names the
    // plugin by `meta` in --print-config and --cache.
    withCustomMessages: typeof withCustomMessages;
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
        "commands/check-callback-uses-checking": commands.checkCallbackUsesChecking,
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
        "no-await-chainable": noAwaitChainable,
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
    } as unknown as ObsidianmdPlugin["rules"],
    configs: {
        recommended: [],
        recommendedWithLocalesEn: []
    },
    ruleConfigs: {
        recommended: {},
        recommendedTypeChecked: {},
    },
    withCustomMessages,
};

// The rules obsidianmd/rule-custom-message runs, each with its message. Only
// no-console is about code that runs in Obsidian (the guidelines ask plugins
// not to fill the developer console); no-new-func is a security rule.
const CUSTOM_MESSAGE_NO_CONSOLE = {
    "no-console": {
        messages: {
            "Unexpected console statement. Only these console methods are allowed: warn, error, debug.": "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
        },
        options: [{ allow: ["warn", "error", "debug"] }],
    },
};
const CUSTOM_MESSAGE_NO_NEW_FUNC = {
    "no-new-func": {
        messages: {
            "The Function constructor is eval": "Using the `Function` constructor is dangerous because it executes arbitrary code, similar to `eval()`",
        },
    },
};

// Rules that require type information (call getParserServices).
// These must only run on files linted with type information (the TS block,
// which extends recommendedTypeChecked). Applying them to plain JS files
// throws "you have used a rule which requires type information".
const recommendedPluginRulesConfigTypeChecked: RulesConfig = {
    "obsidianmd/no-await-chainable": "error",
    "obsidianmd/no-plugin-as-component": "error",
    "obsidianmd/no-view-references-in-plugin": "error",
    "obsidianmd/no-unsupported-api": "error",
    "obsidianmd/prefer-create-el": "warn",
    "obsidianmd/prefer-file-manager-trash-file": "warn",
    "obsidianmd/prefer-instanceof": "warn",
    "obsidianmd/no-misused-promises": "error",
};

const recommendedPluginRulesConfigBase: RulesConfig = {
    "obsidianmd/commands/check-callback-uses-checking": "warn",
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
    "obsidianmd/rule-custom-message": ["error", { ...CUSTOM_MESSAGE_NO_CONSOLE, ...CUSTOM_MESSAGE_NO_NEW_FUNC }],
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
    // @typescript-eslint/no-implied-eval (from recommendedTypeChecked) reports
    // every call the core rule does, and also strings it knows only by type;
    // with both on, each implied eval was reported twice. typescript-eslint's
    // configs turn the core rule off where theirs runs. JavaScript files keep it.
    "no-implied-eval": "off",
};

// Combined rules for TypeScript files
const recommendedPluginRulesConfig: RulesConfig = {
    ...recommendedPluginRulesConfigBase,
    ...recommendedPluginRulesConfigTypeChecked,
};

// Web worker code runs without a window: `window`, `activeWindow`,
// `activeDocument` and Obsidian's DOM helpers do not exist there, so these
// rules' advice cannot be followed and their autofixes (`globalThis` ->
// `window`, `setTimeout` -> `window.setTimeout`) break it. Nor can a worker
// import Obsidian's Platform API, which obsidianmd/platform asks for. They apply
// to every JS/TS file except worker code. A file path is all it takes to match
// WORKER_FILES, so no security rule may be listed here.
const WINDOW_ONLY_RULES = new Set([
    "obsidianmd/no-global-this",
    "obsidianmd/platform",
    "obsidianmd/prefer-active-doc",
    "obsidianmd/prefer-create-el",
    "obsidianmd/prefer-instanceof",
    "obsidianmd/prefer-window-timers",
]);
// Worker code is named `worker.ts`, `*.worker.ts`, `*-worker.ts` or
// `*_worker.ts`, or sits in a `workers/` directory. Not a `worker/` directory:
// one can hold the main-thread code that starts the worker, such as
// `src/worker/loader.ts` beside `src/worker/image.worker.ts`.
const WORKER_FILES = [
    '**/worker.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
    '**/*.worker.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
    '**/*-worker.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
    '**/*_worker.{ts,cts,mts,tsx,js,cjs,mjs,jsx}',
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
// Node.js modules are available, mocks cast to TFile and delete files outright,
// fixtures name `.obsidian`, set styles and add stylesheets, there is no user to
// read a console, language setting or OS, and the code never runs in an older
// Obsidian (no-unsupported-api) or on iOS before 16.4 (regex-lookbehind). They
// are the window-only rules plus these, and rule-custom-message's no-console,
// which the blocks below handle. A file path is all it takes to match
// TEST_FILES, so no security rule may be listed here. no-forbidden-elements
// and regex-lookbehind are not: they keep CSS in styles.css and code working on
// older iOS, which tests and tools need not. The community scanner, which does
// not lint tests at all, reports both in every other file whatever its name.
const OBSIDIAN_RUNTIME_RULES = new Set([
    ...WINDOW_ONLY_RULES,
    "obsidianmd/hardcoded-config-path",
    "obsidianmd/no-forbidden-elements",
    "obsidianmd/no-nodejs-modules",
    "obsidianmd/no-static-styles-assignment",
    "obsidianmd/no-tfile-tfolder-cast",
    "obsidianmd/no-unsupported-api",
    "obsidianmd/prefer-file-manager-trash-file",
    "obsidianmd/prefer-get-language",
    "obsidianmd/regex-lookbehind",
]);
// The test files the community scanner leaves out (its ignores.json), plus the
// end-to-end tests, which drive Obsidian from Node: `e2e/` and `e2e-tests/` hold
// them, `*.e2e.*` names them (wdio-obsidian-service's convention), and
// `wdio.conf.*`, `wdio.<name>.conf.*` and `playwright.config.*` configure their
// runners. Also the test runners' setup files (`vitest.setup.ts`,
// `jest.setup.js`, `src/test-setup.ts`, `setupTests.ts`, `global-setup.ts`),
// fakes named `*.testing.*`, and the helper directories of tests kept beside
// them. Each name is only used for tests; end-to-end encryption code (`e2ee`),
// `src/commands/gym-log-setup.ts` and `src/testing/`, which may hold code that
// runs in Obsidian, do not match. These are `ignores` in blocks that already
// apply to JS and TS files alone, and `files` only paired with those.
const TEST_FILES = [
    '**/*.{test,tests,spec,specs,e2e,setup,testing}.*',
    '**/{test,tests,__tests__,mocks,__mocks__,e2e,e2e-tests}/**',
    '**/{test-helpers,test_helpers,test-support,test-utils,test_utils}/**',
    '**/{test-setup,setupTests,global-setup,*-global-setup}.*',
    '**/testUtils*',
    '**/testUtils*/**',
    '{automation,test-vault}/**',
    '**/{wdio.conf,wdio.*.conf,playwright.config}.*',
];
// Build, test and lint tool configs and scripts, which run in Node and never in
// Obsidian, as the community scanner leaves them out (its ignores.json): the
// configs named after their tool, as `vite.config.ts`, `vitest.e2e.config.mts`
// or `.eslintrc.js` (a plugin's own `config.ts` or `settings.config.ts` is not
// one), the sample plugin's `esbuild.config.mjs` and `version-bump.mjs` and
// other esbuild scripts, and `scripts/` directories. They get the same
// exemptions as tests.
const TOOLING_FILES = [
    '**/{astro,babel,commitlint,docusaurus,esbuild,eslint,jest,oxlint,postcss,prettier,rolldown,rollup,stylelint,svelte,tailwind,tsdown,tsup,uno,vite,vitest,webpack}.config.*',
    '**/{eslint,jest,vite,vitest}.*.config.*',
    '**/.{babelrc,eslintrc,mocharc,prettierrc}.*',
    '**/{esbuild,version-bump}.*',
    '**/scripts/**',
];
const NOT_RUN_IN_OBSIDIAN = [...TEST_FILES, ...TOOLING_FILES];

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

// rule-custom-message runs no-console and no-new-func, and only no-console is
// about code that runs in Obsidian. One rule cannot be left out of the test and
// tooling files in part, so the JS and TS blocks give every file the rule with
// no-new-func alone, and the blocks for code that runs in Obsidian restate it
// with both. Anything reading the config's rules without regard to `files` sees
// the full rule last, as it sees the other Obsidian-runtime rules on.
const CUSTOM_MESSAGE_RULE = "obsidianmd/rule-custom-message";
const customMessageEverywhere: RulesConfig = {
    [CUSTOM_MESSAGE_RULE]: ["error", CUSTOM_MESSAGE_NO_NEW_FUNC],
};

import { fixDryRunConfigs } from "./singleRun.js";
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
    // obsidianmd/no-nodejs-modules checks require() calls itself, and its
    // message tells the developer to load a Node module with a dynamic import()
    // or a require() guarded by Platform.isDesktop; this blanket ban would
    // report that require() in turn.
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
            // `depend` (since 0.3.0) and `noUnsanitizedPlugin` (since 0.2.9)
            // run none of their rules in this block or the TS one, but a user's
            // config object that turns one of their rules on for JS or TS files
            // (depend/ban-dependencies also checks imports) finds the plugin
            // only here, and fails with "Could not find plugin" without it.
            // no-unsanitized's rules run as no-unsanitized/*, the name its own
            // config in `extends` registers; `noUnsanitizedPlugin` is the same
            // plugin under the name these blocks have always given it.
            depend,
            noUnsanitizedPlugin: noUnsanitizedPlugin as ESLint.Plugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{js,cjs,mjs,jsx}'],
        extends: [...(tseslint.configs.recommended as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...pickRules(recommendedPluginRulesConfigBase, (rule) => !isRuntimeOnly(rule)),
            ...customMessageEverywhere,
        }
    },
    {
        plugins: {
            import: importPlugin as ESLint.Plugin,
            "@microsoft/sdl": sdl as ESLint.Plugin,
            // Kept for user configs, as in the JS block.
            depend,
            noUnsanitizedPlugin: noUnsanitizedPlugin as ESLint.Plugin,
            "eslint-comments": eslintComments,
        },
        files: ['**/*.{ts,cts,mts,tsx}'],
        extends: [...(tseslint.configs.recommendedTypeChecked as Config[]), noUnsanitizedPlugin.configs.recommended],
        rules: {
            ...flatRecommendedGeneralRules,
            ...recommendedTypeCheckedGeneralRules,
            ...pickRules(recommendedPluginRulesConfig, (rule) => !isRuntimeOnly(rule)),
            ...customMessageEverywhere,
        },
    },
    ...fixDryRunConfigs(process.argv),
    {
        files: ['**/*.{js,cjs,mjs,jsx}'],
        ignores: [...WORKER_FILES, ...NOT_RUN_IN_OBSIDIAN],
        rules: pickRules(recommendedPluginRulesConfigBase, isWindowOnly),
    },
    {
        files: ['**/*.{ts,cts,mts,tsx}'],
        ignores: [...WORKER_FILES, ...NOT_RUN_IN_OBSIDIAN],
        rules: pickRules(recommendedPluginRulesConfig, isWindowOnly),
    },
    // The full rule-custom-message, with no-console, comes back here.
    {
        files: ['**/*.{js,cjs,mjs,jsx}'],
        ignores: NOT_RUN_IN_OBSIDIAN,
        rules: {
            ...pickRules(recommendedPluginRulesConfigBase, isRuntimeNotWindowOnly),
            ...pickRules(recommendedPluginRulesConfigBase, (rule) => rule === CUSTOM_MESSAGE_RULE),
        },
    },
    {
        files: ['**/*.{ts,cts,mts,tsx}'],
        ignores: NOT_RUN_IN_OBSIDIAN,
        rules: {
            ...pickRules(recommendedPluginRulesConfig, isRuntimeNotWindowOnly),
            ...pickRules(recommendedPluginRulesConfig, (rule) => rule === CUSTOM_MESSAGE_RULE),
        },
    },
    {
        files: ['package.json'],
        language: 'json/json',
        extends: [tseslint.configs.disableTypeChecked],
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
        extends: [tseslint.configs.disableTypeChecked],
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
        extends: [tseslint.configs.disableTypeChecked],
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
    // Test files and tool configs run in Node, not in Obsidian, so they get
    // the Node globals even where the plugin is not desktop-only:
    // `module.exports` in `jest.config.js` and `process` in a script. Each
    // pattern is paired with the JS and TS files, as flat config reads a
    // nested array as patterns that must all match, so that no other
    // language, such as JSON, gets JavaScript's language options.
    {
        files: NOT_RUN_IN_OBSIDIAN.map((pattern) => ['**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}', pattern]),
        languageOptions: {
            globals: {
                ...globals.node,
                NodeJS: "readonly",
            },
        },
    },
    // A `.cjs` file is CommonJS, where `module` and `exports` are defined
    // (`require` is declared above). ESLint reads it so by default, but the
    // typescript-eslint base config the JS block extends sets
    // `sourceType: "module"` for it. Declaring the two globals restores them
    // without `sourceType: "commonjs"`, under which `no-redeclare` checks the
    // file's top level against the built-in globals, and
    // `const { Plugin } = require("obsidian")` is reported, because `Plugin`
    // is also a browser global.
    {
        files: ['**/*.cjs'],
        languageOptions: {
            globals: {
                module: "writable",
                exports: "writable",
            },
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
        // The files the rule's own path check (isEnglishLocalePath) accepts:
        // named "en" in any case, alone or followed by ".", "-" or "_" and
        // more (en-US, en_GB, en.messages), or anywhere under a directory
        // named so. Not english.json, entries.json or env.json.
        files: [
            "**/[eE][nN].json",
            "**/[eE][nN][._-]?*.json",
            "**/[eE][nN]/**/*.json",
            "**/[eE][nN][._-]?*/**/*.json",
        ],
        rules: {
            "obsidianmd/ui/sentence-case-json": "warn",
        },
    },
    // TS/JS English locale modules, named as the JSON files above
    {
        plugins: { obsidianmd: plugin },
        files: [
            "**/[eE][nN].{ts,js,cjs,mjs}",
            "**/[eE][nN][._-]?*.{ts,js,cjs,mjs}",
            "**/[eE][nN]/**/*.{ts,js,cjs,mjs}",
            "**/[eE][nN][._-]?*/**/*.{ts,js,cjs,mjs}",
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

plugin.ruleConfigs = {
    /** Base obsidianmd rules that do not require type information. Safe to use with any parser setup. */
    recommended: recommendedPluginRulesConfigBase,
    /** Obsidianmd rules that require typescript-eslint type-aware linting (recommendedTypeChecked or stricter). */
    recommendedTypeChecked: recommendedPluginRulesConfigTypeChecked,
};

export default plugin;
// Types only: at runtime the module has just its default export, as eslint-doc-generator
// and require() of the package expect, so withCustomMessages is reached as
// obsidianmd.withCustomMessages.
export type { CustomMessages, WrappableRule } from "./customMessages.js";
