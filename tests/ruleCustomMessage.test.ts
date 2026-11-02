import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
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
        {
            name: "a report whose message matches no key is dropped",
            code: "console.log('dropped');",
            options: [{ "no-console": { messages: { "no such message": "Custom" }, options: [{}] } }],
        },
        {
            name: "an unknown rule name is skipped",
            code: "console.log('x');",
            options: [{ "does-not-exist": { messages: { "x": "y" } } }],
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
                        message:
                            "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
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
                        message:
                            "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console",
                        ruleName: "no-console",
                    },
                },
            ],
        },
        {
            name: "the first matching key wins",
            code: "console.log('x');",
            options: [{ "no-console": { messages: { "Unexpected": "First", "console": "Second" }, options: [{}] } }],
            errors: [{ messageId: "customMessage", data: { message: "First", ruleName: "no-console" } }],
        },
        {
            name: "numeric placeholders stay unfilled, so a key matches the fixed wording",
            code: "function f(a, b, c) {}",
            options: [{ "max-params": { messages: { "has too many parameters": "Custom" }, options: [{ max: 1 }] } }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "max-params" } }],
        },
    ],
});

// Current limitations, described in docs/rules/rule-custom-message.md. The
// wrapper passes `options` to the wrapped rule as given and forwards only
// node-based reports without fixes.
describe("rule-custom-message limitations", () => {
    const lint = (entry: Record<string, unknown>, code: string) =>
        new Linter().verify(code, [{
            plugins: { o: { rules: { r: ruleCustomMessage as never } } },
            rules: { "o/r": ["error", entry] },
        }]);

    it("a core rule wrapped without options does not run", () => {
        const original = console.error;
        console.error = () => {};
        try {
            assert.deepStrictEqual(lint({ "no-console": { messages: { "Unexpected console": "Custom" } } }, "console.log(1);"), []);
        } finally {
            console.error = original;
        }
    });

    it("a matched report that carries a fix stops ESLint", () => {
        assert.throws(
            () => lint({ "prefer-const": { messages: { "is never reassigned": "Custom" }, options: [{}] } }, "let a = 1; console.log(a);"),
            /Fixable rules must set the `meta.fixable` property/,
        );
    });

    it("a matched report with a location but no node stops ESLint", () => {
        assert.throws(
            () => lint({ "max-lines": { messages: { "too many lines": "Custom" }, options: [{ max: 1 }] } }, "a;\nb;\nc;\n"),
            /Node must be provided/,
        );
    });
});
