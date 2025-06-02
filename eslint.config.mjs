import hardcodedConfigPath from "./dist/lib/rules/hardcodedConfigPath.js";
import objectAssign from "./dist/lib/rules/objectAssign.js";
import platform from "./dist/lib/rules/platform.js";
import regexLookbehind from "./dist/lib/rules/regexLookbehind.js";
import sampleNames from "./dist/lib/rules/sampleNames.js";
import commands from "./dist/lib/rules/commands.js";
import settingsTab from "./dist/lib/rules/settingsTab.js";
import detachLeaves from "./dist/lib/rules/detachLeaves.js";
import vaultIterate from "./dist/lib/rules/vault/iterate.js";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      obsidianmd: {
        rules: {
          "hardcoded-config-path": hardcodedConfigPath,
          "object-assign": objectAssign,
          "platform": platform,
          "regex-lookbehind": regexLookbehind,
          "sample-names": sampleNames,
          "commands": commands,
          "settings-tab": settingsTab,
          "detach-leaves": detachLeaves,
          "vault-iterate": vaultIterate
        }
      }
    },
    rules: {
      "obsidianmd/hardcoded-config-path": "error",
      "obsidianmd/object-assign": "error",
      "obsidianmd/platform": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/sample-names": "error",
      "obsidianmd/commands": "error",
      "obsidianmd/settings-tab": "error",
      "obsidianmd/detach-leaves": "error",
      "obsidianmd/vault-iterate": "error"
    }
  }
];
