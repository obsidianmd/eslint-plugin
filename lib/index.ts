import detachLeaves from "./rules/detachLeaves";
import objectAssign from "./rules/objectAssign";
import regexLookbehind from "./rules/regexLookbehind";
import sampleNames from "./rules/sampleNames";
import commands from "./rules/commands";
import platform from "./rules/platform";
import settingsTab from "./rules/settingsTab";
import hardcodedConfigPath from "./rules/hardcodedConfigPath";
import vaultIterate from './rules/vault/iterate';
import {manifest} from "./readManifest";

export = {
    meta: {
        name: 'eslint-plugin-obsidianmd',
        version: '0.0.2',
    },
    rules: {
        "detach-leaves": detachLeaves,
        "object-assign": objectAssign,
        "regex-lookbehind": regexLookbehind,
        "sample-names": sampleNames,
        "commands": commands,
        "platform": platform,
        "settings-tab": settingsTab,
        "hardcoded-config-path": hardcodedConfigPath,
        'vault-iterate': vaultIterate

    },
    configs: {
        recommended: {
            extends: [
                "eslint:recommended",
                "plugin:@typescript-eslint/recommended",
                "plugin:deprecation/recommended",
                "plugin:json-schema-validator/recommended"
            ],
            plugins: [
                "@typescript-eslint",
                "@microsoft/eslint-plugin-sdl",
                "import",
                "json-schema-validator"
            ],
            rules: {
                "no-unused-vars": "off",
                "no-prototype-bultins": "off",
                "no-self-compare": "warn",
                "no-eval": "error",
                "no-implied-eval": "error",
                "prefer-const": "off",
                "no-implicit-globals": "error",
                "no-console": [
                    "warn",
                    {
                        "allow": ["warn", "error", "debug"]
                    }
                ],
                "no-restricted-globals": [
                    "error",
                    {
                        "name": "app",
                        "message": "Avoid using the global app object. Instead use the reference provided by your plugin instance."
                    }
                ],
                "no-alert": "error",
                "no-undef": "error",

                "@typescript/eslint-ban-ts-comment": "off",
                "@typescript-eslint/no-unused-vars": [
                    "warn",
                    {
                        "args": "none"
                    }
                ],
                "@typescript-eslint/ban-ts-comment": "off",
                "@typescript-eslint/await-thenable": "warn",
                "@typescript-eslint/no-invalid-this": "error",
                "@typescript-eslint/no-require-imports": "warn",
                "@typescript-eslint/no-var-requires": "off",
                "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
                "@typescript-eslint/no-unsafe-assignment": "off",
                "@typescript-eslint/no-empty-function": "off",
                "@typescript-eslint/prefer-ts-expect-error": "error",

                "@microsoft/sdl/no-document-write": "error",
                "@microsoft/sdl/no-inner-html": "error",

                "import/no-nodejs-modules": manifest.isDesktopOnly ? 'off' : 'error',
                "import/no-extraneous-dependencies": "error",

                "obsidianmd/detach-leaves": "error",
                "obsidianmd/object-assign": "error",
                "obsidianmd/regex-lookbehind": "error",
                "obsidianmd/sample-names": "error",
                "obsidianmd/commands": "error",
                "obsidianmd/platform": "error",
                "obsidianmd/settings-tab": "error",
                "obsidianmd/hardcoded-config-path": "error",
                "obsidianmd/vault-iterate": "error",
            }
        }
    }
};
