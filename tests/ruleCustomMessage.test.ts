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

const loggingMessage =
    "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console";

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
        {
            // Without the schema default, words is undefined and the rule
            // reports the space instead.
            name: "a schema default of the wrapped rule takes effect",
            code: "typeof (a);",
            options: [{ "space-unary-ops": { messages: { "unary word operator": "Custom" }, options: [{}] } }],
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
                    data: { message: loggingMessage, ruleName: "no-console" },
                    suggestions: [
                        { messageId: "suggestion", data: { description: "Remove the console.log()." }, output: "" },
                    ],
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
                    data: { message: loggingMessage, ruleName: "no-console" },
                    suggestions: [
                        { messageId: "suggestion", data: { description: "Remove the console.info()." }, output: "" },
                    ],
                },
            ],
        },
        {
            name: "the first matching key wins",
            code: "foo(console.log);",
            options: [{ "no-console": { messages: { "Unexpected": "First", "console": "Second" }, options: [{}] } }],
            errors: [{ messageId: "customMessage", data: { message: "First", ruleName: "no-console" } }],
        },
        {
            name: "a key may be part of the message",
            code: "function f(a, b, c) {}",
            options: [{ "max-params": { messages: { "has too many parameters": "Custom" }, options: [{ max: 1 }] } }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "max-params" } }],
        },
        {
            // Numbers in the data are filled in as ESLint does, so a message
            // copied from ESLint's output matches.
            name: "a key may be the whole message, numbers included",
            code: "function f(a, b, c) {}",
            options: [{
                "max-params": {
                    messages: { "Function 'f' has too many parameters (3). Maximum allowed is 1.": "Custom" },
                    options: [{ max: 1 }],
                },
            }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "max-params" } }],
        },
        {
            // no-console reads its options as `[{ allow }]`; ESLint gives it
            // meta.defaultOptions ([{}]) when none are set, and so does the
            // wrapper.
            name: "a core rule wrapped without options runs with its default options",
            code: "foo(console.log);",
            options: [{ "no-console": { messages: { "Unexpected console statement.": "Custom" } } }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "no-console" } }],
        },
        {
            // no-warning-comments has meta.defaultOptions
            // [{ location: "start", terms: ["todo", "fixme", "xxx"] }] and
            // reads terms without a fallback.
            name: "given options are merged over meta.defaultOptions",
            code: "// see todo",
            options: [{ "no-warning-comments": { messages: { "Unexpected 'todo' comment": "Custom" }, options: [{ location: "anywhere" }] } }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "no-warning-comments" } }],
        },
        {
            // space-unary-ops has no meta.defaultOptions; its schema defaults
            // words to true, which ESLint fills in when validating options.
            name: "schema defaults are applied to the given options",
            code: "typeof!a;",
            options: [{ "space-unary-ops": { messages: { "must be followed by whitespace": "Custom" }, options: [{}] } }],
            output: "typeof !a;",
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "space-unary-ops" } }],
        },
        {
            name: "a fix of a matched report is forwarded",
            code: "let a = 1; console.log(a);",
            options: [{ "prefer-const": { messages: { "is never reassigned": "Custom" } } }],
            output: "const a = 1; console.log(a);",
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "prefer-const" } }],
        },
        {
            name: "a report with a location but no node is forwarded at that location",
            code: "a;\nb;\nc;\n",
            options: [{ "max-lines": { messages: { "too many lines": "Custom" }, options: [{ max: 1 }] } }],
            errors: [{ messageId: "customMessage", data: { message: "Custom", ruleName: "max-lines" }, line: 2, column: 1, endLine: 4, endColumn: 1 }],
        },
        {
            name: "two wrapped rules with the same code path handler both get its arguments",
            code: "const o = { get a() {} }; [1].map(function () {});",
            options: [{
                "getter-return": { messages: { "Expected to return a value": "Getter" } },
                "array-callback-return": { messages: { "expects a return value": "Callback" } },
            }],
            errors: [
                { messageId: "customMessage", data: { message: "Getter", ruleName: "getter-return" } },
                { messageId: "customMessage", data: { message: "Callback", ruleName: "array-callback-return" } },
            ],
        },
    ],
});

describe("rule-custom-message in a lint run", () => {
    const lint = (entry: Record<string, unknown>, code: string, fix = false) => {
        const config = [{
            plugins: { o: { rules: { r: ruleCustomMessage as never } } },
            rules: { "o/r": ["error", entry] },
        }] as Linter.Config[];
        const linter = new Linter();
        return fix ? linter.verifyAndFix(code, config) : { messages: linter.verify(code, config), output: code };
    };

    it("applies a forwarded fix with --fix", () => {
        const result = lint({ "prefer-const": { messages: { "is never reassigned": "Custom" } } }, "let a = 1; console.log(a);", true);
        assert.strictEqual(result.output, "const a = 1; console.log(a);");
    });

    it("offers a forwarded suggestion with the wrapped rule's description", () => {
        const { messages } = lint({ "no-console": { messages: { "Unexpected console": "Custom" } } }, "console.log(1);");
        assert.deepStrictEqual(messages.map((m) => [m.message, m.suggestions?.map((s) => s.desc)]), [
            ["[no-console] Custom", ["Remove the console.log()."]],
        ]);
    });

    it("reports a location-only report where the wrapped rule put it", () => {
        const { messages } = lint({ "max-lines": { messages: { "too many lines": "Custom" }, options: [{ max: 1 }] } }, "a;\nb;\nc;\n");
        assert.deepStrictEqual(messages.map((m) => [m.message, m.line, m.column]), [["[max-lines] Custom", 2, 1]]);
    });
});

// ESLint deep-clones rule options with structuredClone, which cannot copy a
// rule's functions, so the options cannot carry a plugin's rule, and the
// `rule` key meant for one is gone; obsidianmd.withCustomMessages() wraps one instead.
// Described in docs/rules/rule-custom-message.md.
describe("rule-custom-message limitations", () => {
    const lintWith = (entry: Record<string, unknown>) => new Linter().verify("a;", [{
        plugins: { o: { rules: { r: ruleCustomMessage as never } } },
        rules: { "o/r": ["error", entry] },
    }]);

    it("a plugin rule object in the options stops ESLint before linting", () => {
        const pluginRule = { meta: { messages: {} }, create: () => ({}) };
        assert.throws(() => lintWith({ "p/r": { messages: { x: "y" }, rule: pluginRule } }), /could not be cloned/);
    });

    it("the options have no `rule` key", () => {
        assert.throws(() => lintWith({ "p/r": { messages: { x: "y" }, rule: {} } }), /Unexpected property "rule"/);
    });

    it("a rule name that is not a core rule logs a warning that points to obsidianmd.withCustomMessages()", () => {
        const warnings: unknown[][] = [];
        const warn = console.warn;
        console.warn = (...args: unknown[]) => { warnings.push(args); };
        try {
            lintWith({ "p/r": { messages: { x: "y" } } });
        } finally {
            console.warn = warn;
        }
        assert.deepStrictEqual(warnings, [[
            'Rule "p/r" not found: it is not a core ESLint rule. For a plugin\'s rule, use obsidianmd.withCustomMessages() instead: https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/rule-custom-message.md#wrapping-a-plugins-rule',
        ]]);
    });
});
