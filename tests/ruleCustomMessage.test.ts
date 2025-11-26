import { RuleTester } from "@typescript-eslint/rule-tester";
import ruleCustomMessage from "lib/rules/ruleCustomMessage.js";

const ruleTester = new RuleTester();

const entry = {
    "no-console": {
        messages: {
            "Unexpected console statement. Only these console methods are allowed: warn, error, debug.": "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
        },
        options: [{ allow: ["warn", "error", "debug"] }],
    },
};
const options = [entry] as const;

ruleTester.run("rule-custom-message", ruleCustomMessage, {
    valid: [
        {
            code: "console.warn('This is a warning');",
            options,
        },
        {
            code: "console.error('This is an error');",
            options
        },
        {
            code: "console.debug('This is a debug');",
            options,
        },
    ],
    invalid: [
        {
            code: "console.log('This is a log');",
            options,
            errors: [
                {
                    messageId: "customMessage",
                    data: {
                        message:
                            "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        ruleName: "no-console",
                    },
                },
            ],
        },
        {
            code: "console.info('This is an info');",
            options,
            errors: [
                {
                    messageId: "customMessage",
                    data: {
                        message:
                            "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        ruleName: "no-console",
                    },
                },
            ],
        },
    ],
});
