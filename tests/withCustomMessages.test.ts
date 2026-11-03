import assert from "node:assert";
import path from "node:path";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import type { TSESLint } from "@typescript-eslint/utils";
import tseslint from "typescript-eslint";
import { ESLint, Linter, type Rule } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import plugin from "../lib/index.js";

const { withCustomMessages } = plugin;

const coreRule = (name: string) => builtinRules.get(name) as Rule.RuleModule;

const lint = (rule: Rule.RuleModule, ruleConfig: Linter.RuleEntry, code: string, settings?: Record<string, unknown>) => {
    const config: Linter.Config[] = [{
        plugins: { custom: { rules: { wrapped: rule } } },
        rules: { "custom/wrapped": ruleConfig },
        ...(settings && { settings }),
    }];
    return new Linter().verify(code, config, "file.js");
};

const messagesOf = (problems: Linter.LintMessage[]) => problems.map((m) => m.message);

describe("withCustomMessages", () => {
    it("is a property of the default export, the module's only runtime export", async () => {
        assert.strictEqual(typeof plugin.withCustomMessages, "function");
        assert.deepStrictEqual(Object.keys(await import("../lib/index.js")), ["default"]);
    });

    it("keeps the wrapped rule's meta and other properties and leaves the rule unchanged", () => {
        const original = tsPlugin.rules["no-explicit-any"];
        const create = original.create;
        const wrapped = withCustomMessages(original, { "Unexpected any": "Custom" });
        assert.notStrictEqual(wrapped, original);
        assert.strictEqual(wrapped.meta, original.meta);
        assert.strictEqual(wrapped.defaultOptions, original.defaultOptions);
        assert.notStrictEqual(wrapped.create, create);
        assert.strictEqual(original.create, create);
    });

    it("replaces a matching message, at the wrapped rule's location and the configured severity", () => {
        const problems = lint(withCustomMessages(coreRule("no-console"), { "Unexpected console statement": "Custom" }), "warn", "\nconsole.log(1);");
        assert.deepStrictEqual(
            problems.map((m) => [m.ruleId, m.message, m.severity, m.line, m.column]),
            [["custom/wrapped", "Custom", 1, 2, 1]],
        );
    });

    it("matches the message with its placeholders filled in, whole or in part, and the first matching key wins", () => {
        const code = "function f(a, b, c) {}";
        const options: Linter.RuleEntry = ["error", { max: 1 }];
        const whole = withCustomMessages(coreRule("max-params"), {
            "Function 'f' has too many parameters (3). Maximum allowed is 1.": "Whole",
        });
        const part = withCustomMessages(coreRule("max-params"), { "too many": "First", "parameters": "Second" });
        assert.deepStrictEqual(messagesOf(lint(whole, options, code)), ["Whole"]);
        assert.deepStrictEqual(messagesOf(lint(part, options, code)), ["First"]);
    });

    it("fills the report's placeholders into the new message", () => {
        const rule = withCustomMessages(coreRule("max-params"), { "too many parameters": "{{name}} takes {{count}} parameters, at most {{max}} please" });
        assert.deepStrictEqual(
            messagesOf(lint(rule, ["error", { max: 1 }], "function f(a, b, c) {}")),
            ["Function 'f' takes 3 parameters, at most 1 please"],
        );
    });

    it("reports a message that matches no key unchanged", () => {
        const rule = withCustomMessages(coreRule("no-console"), { "no such message": "Custom" });
        const problems = lint(rule, "error", "console.log(1);");
        assert.deepStrictEqual(problems.map((m) => [m.message, m.messageId]), [["Unexpected console statement.", "unexpected"]]);
    });

    it("runs the wrapped rule with the configured options, its defaults filled in", () => {
        const rule = withCustomMessages(coreRule("no-console"), { "Unexpected console statement": "Custom" });
        assert.deepStrictEqual(messagesOf(lint(rule, ["error", { allow: ["warn"] }], "console.warn(1); console.log(2);")), ["Custom"]);
        // no-warning-comments reads `terms` without a fallback: ESLint fills it
        // in from meta.defaultOptions.
        const comments = withCustomMessages(coreRule("no-warning-comments"), { "Unexpected 'todo' comment": "Custom" });
        assert.deepStrictEqual(messagesOf(lint(comments, ["error", { location: "anywhere" }], "// see todo")), ["Custom"]);
    });

    it("has ESLint check the options against the wrapped rule's schema", () => {
        const rule = withCustomMessages(coreRule("no-console"), { "Unexpected": "Custom" });
        assert.throws(() => lint(rule, ["error", { nope: true }], "a;"), /Key "custom\/wrapped"[\s\S]*Unexpected property "nope"/);
    });

    it("applies the wrapped rule's fix", () => {
        const rule = withCustomMessages(coreRule("prefer-const"), { "is never reassigned": "Custom" });
        const config: Linter.Config[] = [{ plugins: { custom: { rules: { wrapped: rule } } }, rules: { "custom/wrapped": "error" } }];
        const result = new Linter().verifyAndFix("let a = 1; console.log(a);", config);
        assert.strictEqual(result.output, "const a = 1; console.log(a);");
    });

    it("offers the wrapped rule's suggestions under its descriptions", () => {
        const rule = withCustomMessages(coreRule("no-console"), { "Unexpected console": "Custom" });
        const problems = lint(rule, "error", "console.log(1);");
        assert.deepStrictEqual(
            problems.map((m) => [m.message, m.suggestions?.map((s) => s.desc)]),
            [["Custom", ["Remove the console.log()."]]],
        );
    });

    it("reports a location-only report where the wrapped rule put it", () => {
        const rule = withCustomMessages(coreRule("max-lines"), { "too many lines": "Custom" });
        const problems = lint(rule, ["error", { max: 1 }], "a;\nb;\nc;\n");
        assert.deepStrictEqual(problems.map((m) => [m.message, m.line, m.column, m.endLine]), [["Custom", 2, 1, 4]]);
    });

    it("runs the wrapped rule's :exit and code path handlers", () => {
        // getter-return and array-callback-return report from onCodePathEnd.
        const getter = withCustomMessages(coreRule("getter-return"), { "Expected to return a value": "Getter" });
        const callback = withCustomMessages(coreRule("array-callback-return"), { "expects a return value": "Callback" });
        assert.deepStrictEqual(messagesOf(lint(getter, "error", "const o = { get a() {} };")), ["Getter"]);
        assert.deepStrictEqual(messagesOf(lint(callback, "error", "[1].map(function () {});")), ["Callback"]);

        const exitRule: Rule.RuleModule = {
            meta: { messages: { last: "Last statement" } },
            create(context) {
                let last: Rule.Node | undefined;
                return {
                    ExpressionStatement(node) { last = node; },
                    "Program:exit"() { if (last) context.report({ node: last, messageId: "last" }); },
                };
            },
        };
        assert.deepStrictEqual(messagesOf(lint(withCustomMessages(exitRule, { "Last": "Custom" }), "error", "a; b;")), ["Custom"]);
    });

    it("gives the wrapped rule the rest of the context", () => {
        const contextRule: Rule.RuleModule = {
            meta: { schema: [{ type: "string" }], messages: { info: "{{info}}" } },
            create(context) {
                return {
                    Program(node) {
                        const info = [
                            context.id,
                            context.options[0],
                            context.settings.answer,
                            context.filename,
                            context.sourceCode.getText(node),
                            context.sourceCode.getScope(node).type,
                        ].join(" ");
                        context.report({ node, messageId: "info", data: { info } });
                    },
                };
            },
        };
        const rule = withCustomMessages(contextRule, { "custom/wrapped": "Seen: {{info}}" });
        assert.deepStrictEqual(
            messagesOf(lint(rule, ["error", "option"], "a;", { answer: 42 })),
            ["Seen: custom/wrapped option 42 file.js a; global"],
        );
    });

    it("replaces the messages of a rule that reports with positional arguments", () => {
        const positional: Rule.RuleModule = {
            create(context) {
                return {
                    Identifier(node) {
                        // ESLint still accepts the old (node, message, data) form.
                        (context.report as (...args: unknown[]) => void)(node, "Old {{name}}", { name: node.name });
                    },
                };
            },
        };
        const rule = withCustomMessages(positional, { "Old a": "New {{name}}" });
        assert.deepStrictEqual(messagesOf(lint(rule, "error", "a; b;")), ["New a", "Old b"]);
    });

    it("rejects a missing rule and messages that are not strings", () => {
        assert.throws(() => withCustomMessages(undefined as never, {}), TypeError);
        assert.throws(() => withCustomMessages(coreRule("no-console"), { a: 1 } as never), TypeError);
    });

    it("works in a config ESLint serializes, as --print-config and --cache do", async () => {
        const eslint = new ESLint({
            overrideConfigFile: true,
            overrideConfig: [{
                plugins: {
                    obsidianmd: plugin,
                    custom: { rules: { wrapped: withCustomMessages(coreRule("no-console"), { "Unexpected": "Custom" }) } },
                },
                rules: { "custom/wrapped": ["error", { allow: ["warn"] }] },
            }],
        });
        const config = await eslint.calculateConfigForFile("file.js") as Linter.Config;
        const printed = JSON.parse(JSON.stringify(config)) as { plugins: string[]; rules: Record<string, unknown> };
        assert.ok(printed.plugins.includes("custom"));
        assert.deepStrictEqual(printed.rules["custom/wrapped"], [2, { allow: ["warn"] }]);
        const [result] = await eslint.lintText("console.log(1);", { filePath: "file.js" });
        assert.deepStrictEqual(messagesOf(result.messages), ["Custom"]);
    });
});

describe("withCustomMessages with typescript-eslint rules", () => {
    const lintTs = (rule: TSESLint.RuleModule<string, readonly unknown[]>, ruleConfig: Linter.RuleEntry, code: string) => {
        const config: Linter.Config[] = [{
            files: ["**/*.ts"],
            languageOptions: {
                parser: tseslint.parser,
                parserOptions: {
                    project: "./tsconfig.json",
                    tsconfigRootDir: process.cwd(),
                    // With CI=true, typescript-eslint otherwise builds the program once
                    // from the files on disk and ignores the code linted here.
                    disallowAutomaticSingleRunInference: true,
                },
            },
            plugins: { custom: { rules: { wrapped: rule } } as unknown as ESLint.Plugin },
            rules: { "custom/wrapped": ruleConfig },
        }];
        const filename = path.join(process.cwd(), "file.ts");
        const problems = new Linter().verify(code, config, filename);
        const { output } = new Linter().verifyAndFix(code, config, filename);
        return { problems, output };
    };

    // The result has the wrapped rule's type, so it stays a typescript-eslint
    // RuleModule with that rule's options and message ids.
    const noExplicitAny: typeof tsPlugin.rules["no-explicit-any"] = withCustomMessages(tsPlugin.rules["no-explicit-any"], {
        "Unexpected any": "Custom any",
    });

    it("replaces the message and keeps the suggestions", () => {
        const { problems } = lintTs(noExplicitAny, "error", "const a: any = 1;");
        assert.deepStrictEqual(problems.map((m) => [m.message, m.suggestions?.map((s) => s.messageId)]), [
            ["Custom any", ["suggestUnknown", "suggestNever"]],
        ]);
    });

    it("runs the rule with its own options", () => {
        const code = "function f(...args: any[]) {}";
        assert.deepStrictEqual(messagesOf(lintTs(noExplicitAny, "error", code).problems), ["Custom any"]);
        assert.deepStrictEqual(messagesOf(lintTs(noExplicitAny, ["error", { ignoreRestArgs: true }], code).problems), []);
        assert.strictEqual(lintTs(noExplicitAny, ["error", { fixToUnknown: true }], "const a: any = 1;").output, "const a: unknown = 1;");
    });

    it("wraps a type-aware rule, its fix included", () => {
        const rule = withCustomMessages(tsPlugin.rules["no-unnecessary-type-assertion"], { "does not change the type": "Custom assertion" });
        const { problems, output } = lintTs(rule, "error", "declare const s: string; const t = s as string;");
        assert.deepStrictEqual(messagesOf(problems), ["Custom assertion"]);
        assert.strictEqual(output, "declare const s: string; const t = s;");
        assert.deepStrictEqual(messagesOf(lintTs(rule, "error", "declare const s: string | number; const t = s as string;").problems), []);
    });
});
