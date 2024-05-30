import detachLeaves from "./rules/detachLeaves";
import objectAssign from "./rules/objectAssign";
import regexLookbehind from "./rules/regexLookbehind";
import sampleNames from "./rules/sampleNames";
import commands from "./rules/commands";
import sentenceCase from "./rules/sentenceCase";
import settingsTab from "./rules/settingsTab";
import {manifest} from "./readManifest";

export = {
    meta: {
        name: 'eslint-plugin-obsidian',
        version: '0.0.1',
    },
    rules: {
        "detach-leaves": detachLeaves,
        "object-assign": objectAssign,
        "regex-lookbehind": regexLookbehind,
        "sample-names": sampleNames,
        "commands": commands,
        "sentence-case": sentenceCase,
        "settings-tab": settingsTab

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

                "obsidian/detach-leaves": "error",
                "obsidian/object-assign": "error",
                "obsidian/regex-lookbehind": "error",
                "obsidian/sample-names": "error",
                "obsidian/commands": "error",
                "obsidian/sentence-case": "error",
                "obsidian/settings-tab": "error",


                "json-schema-validator/no-invalid": [
                    "error", {
                        "schemas": [
                            {
                                "fileMatch": ["manifest.json"],
                                "schema": {
                                    "$schema": "https://json-schema.org/draft/2020-12/schema",
                                    "$id": "https://example.com/product.schema.json",
                                    "title": "Product",
                                    "description": "A product from Acme's catalog",
                                    "type": "object",
                                    "properties": {
                                        "productId": {
                                            "description": "The unique identifier for a product",
                                            "type": "integer"
                                        },
                                        "productName": {"description": "Name of the product", "type": "string"},
                                        "price": {
                                            "description": "The price of the product",
                                            "type": "number",
                                            "exclusiveMinimum": 0
                                        }
                                    },
                                    "required": ["productId", "productName", "price"]
                                }
                            }
                        ]
                    }
                ]
            }
        }
    }
};
