import { RuleTester } from "@typescript-eslint/rule-tester";
import hardcodedConfigPathRule from "../lib/rules/hardcodedConfigPath.js";
const ruleTester = new RuleTester();
ruleTester.run("hardcoded-config-path", hardcodedConfigPathRule, {
    valid: [
        {
            name: ".config string is allowed",
            code: 'const config = ".config";',
        },
        {
            name: ".obsidian-cache string is allowed",
            code: 'const config = ".obsidian-cache";',
        },
        {
            name: ".obsidianCache string is allowed",
            code: 'const config = ".obsidianCache";',
        },
    ],
    invalid: [
        {
            name: ".obsidian string is forbidden",
            code: 'const config = ".obsidian";',
            errors: [{ messageId: "configPath" }],
        },
        {
            name: ".obsidian/ path is forbidden",
            code: 'const config = ".obsidian/workspace.json";',
            errors: [{ messageId: "configPath" }],
        },
    ],
});
