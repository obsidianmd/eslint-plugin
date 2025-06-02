import hardcodedConfigPath from "./dist/lib/rules/hardcodedConfigPath.js";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      obsidianmd: { rules: { "hardcoded-config-path": hardcodedConfigPath } },
    },
    rules: {
      "obsidianmd/hardcoded-config-path": "error"
    }
  }
];
