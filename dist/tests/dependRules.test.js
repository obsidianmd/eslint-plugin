import { RuleTester } from "eslint";
import json from "@eslint/json";
import { rules as dependRules } from "eslint-plugin-depend";
const ruleTester = new RuleTester({
    language: "json/json",
    plugins: { json },
});
ruleTester.run("depend-ban-dependencies", dependRules["ban-dependencies"], {
    valid: [
        {
            name: "regular dependency is allowed",
            code: '{"dependencies": {"obsidian": "1.0.0"}}',
            filename: "package.json",
            options: [{ presets: ["native", "microutilities", "preferred"] }],
        },
        {
            name: "empty dependencies is allowed",
            code: '{"dependencies": {}}',
            filename: "package.json",
            options: [{ presets: ["native", "microutilities", "preferred"] }],
        },
    ],
    invalid: [
        {
            name: "micro-utility is-number is forbidden",
            code: '{"dependencies": {"is-number": "1.0.0"}}',
            filename: "package.json",
            options: [{ presets: ["microutilities"] }],
            errors: [{ messageId: "simpleReplacement" }],
        },
        {
            name: "native-replaceable is-nan is forbidden",
            code: '{"dependencies": {"is-nan": "1.0.0"}}',
            filename: "package.json",
            options: [{ presets: ["native"] }],
            errors: [{ messageId: "nativeReplacement" }],
        },
    ],
});
