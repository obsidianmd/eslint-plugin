"use strict";

module.exports = {
    root: true,
    extends: [
        "eslint:recommended",
        "plugin:eslint-plugin/recommended",
        "plugin:node/recommended",
        "plugin:json-scheme-validator/recommended"
    ],
    env: {
        node: true,
    },
    overrides: [
        {
            files: ["tests/**/*.js"],
            env: {mocha: true},
        },
    ],
    rules: {
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
};
