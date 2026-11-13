import obsidianmd from "./dist/lib/index.js";
import eslintPluginPlugin from "eslint-plugin-eslint-plugin";

export default [
    // The build output, and fixtures that tests lint with their own config:
    // tests/fixtures/ts-extensions has .cts/.mts/.tsx files, which the
    // recommended config type-checks but the project below does not cover.
    { ignores: ["dist/**", "tests/fixtures/**"] },
    ...obsidianmd.configs.recommended,
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
    },
    {
        ...eslintPluginPlugin.configs["rules-recommended"],
        files: ["lib/rules/**/*.ts"],
    },
    {
        files: ["lib/rules/**/*.ts"],
        rules: {
            "eslint-plugin/require-meta-docs-url": "error",
            "eslint-plugin/require-meta-docs-description": ["error", { pattern: ".+" }],
            "eslint-plugin/require-meta-default-options": "off",
        },
    },
    {
        ...eslintPluginPlugin.configs["tests-recommended"],
        files: ["tests/**/*.ts"],
    },
    // This repo is the plugin, not an Obsidian plugin: it runs in Node, inside
    // ESLint. The rules about what an Obsidian plugin can rely on at runtime
    // do not apply to it: Node's modules are its platform, its regular
    // expressions never run on iOS, and the hardcoded-config-path rule has to
    // name `.obsidian` to find it.
    {
        rules: {
            "obsidianmd/no-nodejs-modules": "off",
            "obsidianmd/regex-lookbehind": "off",
            "obsidianmd/hardcoded-config-path": "off",
        },
    },
    // eslint-plugin-import is what the recommended config's import rules come
    // from, so it is a dependency of the plugin, not one to replace.
    {
        files: ["package.json"],
        rules: {
            "depend/ban-dependencies": ["error", { allowed: ["eslint-plugin-import"] }],
        },
    },
    // This repo is the plugin, not an Obsidian plugin. Its manifest.json is a
    // fixture for the sample plugin, so the rule is correct to fire here and the
    // findings are unactionable.
    {
        files: ["manifest.json"],
        rules: { "obsidianmd/validate-manifest": "off" },
    },
    // This repo is the plugin, not an Obsidian plugin. Its LICENSE is Dynalist's
    // own, so the rule is correct to fire here and the finding is unactionable.
    {
        files: ["LICENSE"],
        rules: { "obsidianmd/validate-license": "off" },
    },
];
