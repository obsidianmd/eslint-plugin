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
const options = [entry];
ruleTester.run("rule-custom-message", ruleCustomMessage, {
    valid: [
        {
            name: "console.warn is allowed",
            code: "console.warn('This is a warning');",
            options,
        },
        {
            name: "console.error is allowed",
            code: "console.error('This is an error');",
            options
        },
        {
            name: "console.debug is allowed",
            code: "console.debug('This is a debug');",
            options,
        },
    ],
    invalid: [
        {
            name: "console.log triggers custom message",
            code: "console.log('This is a log');",
            options,
            errors: [
                {
                    messageId: "customMessage",
                    data: {
                        message: "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        ruleName: "no-console",
                    },
                },
            ],
        },
        {
            name: "console.info triggers custom message",
            code: "console.info('This is an info');",
            options,
            errors: [
                {
                    messageId: "customMessage",
                    data: {
                        message: "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        ruleName: "no-console",
                    },
                },
            ],
        },
    ],
});
