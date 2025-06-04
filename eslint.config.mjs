import hardcodedConfigPath from "./dist/lib/rules/hardcodedConfigPath.js";
import objectAssign from "./dist/lib/rules/objectAssign.js";
import platform from "./dist/lib/rules/platform.js";
import regexLookbehind from "./dist/lib/rules/regexLookbehind.js";
import sampleNames from "./dist/lib/rules/sampleNames.js";
import commands from "./dist/lib/rules/commands.js";
import settingsTab from "./dist/lib/rules/settingsTab.js";
import detachLeaves from "./dist/lib/rules/detachLeaves.js";
import vaultIterate from "./dist/lib/rules/vault/iterate.js";
import noInnerHtml from "./dist/lib/rules/noInnerHtml.js";
import noDocumentWrite from "./dist/lib/rules/noDocumentWrite.js";

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
          "commands": commands,
          "detach-leaves": detachLeaves,
          "hardcoded-config-path": hardcodedConfigPath,
          "no-document-write": noDocumentWrite,
          "no-inner-html": noInnerHtml,
          "object-assign": objectAssign,
          "platform": platform,
          "regex-lookbehind": regexLookbehind,
          "sample-names": sampleNames,
          "settings-tab": settingsTab,
          "vault-iterate": vaultIterate
        }
      }
    },
    rules: {
      "obsidianmd/commands": "error",
      "obsidianmd/detach-leaves": "error",
      "obsidianmd/hardcoded-config-path": "error",
      "obsidianmd/no-document-write": "error",
      "obsidianmd/no-inner-html": "error",
      "obsidianmd/object-assign": "error",
      "obsidianmd/platform": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/sample-names": "error",
      "obsidianmd/settings-tab": "error",
      "obsidianmd/vault-iterate": "error",
    }
  }
];
