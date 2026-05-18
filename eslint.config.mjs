import obsidianmd from "./dist/lib/index.js";
import eslintPluginPlugin from "eslint-plugin-eslint-plugin";

export default [
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
];
