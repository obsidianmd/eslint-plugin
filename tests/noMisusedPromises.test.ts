import assert from "node:assert";
import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslint from "typescript-eslint";
import type { TSESLint } from "@typescript-eslint/utils";
import { ESLint, Linter } from "eslint";
import noMisusedPromisesRule from "../lib/rules/noMisusedPromises.js";
import plugin from "../lib/index.js";

const ruleTester = new RuleTester();

const upstreamRule = (
    tseslint.plugin as unknown as { rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> }
).rules["no-misused-promises"];

// Obsidian's BaseComponent and Setting declare a chaining `then`, so the upstream
// rule reports each of these as a misused promise. None of them is a promise.
const obsidianChaining = [
    {
        name: "a Setting chain returned from a forEach callback",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            ["a", "b"].forEach((name) => new Setting(el).setName(name));
        `,
        messageId: "voidReturnArgument",
    },
    {
        name: "a Setting in an if condition",
        code: `
            import { Setting } from "obsidian";
            declare const setting: Setting;
            if (setting) { setting.setName("x"); }
        `,
        messageId: "conditional",
    },
    {
        name: "a component on the left of &&",
        code: `
            import { ToggleComponent } from "obsidian";
            declare const toggle: ToggleComponent;
            const value = toggle && toggle.getValue();
        `,
        messageId: "conditional",
    },
    {
        name: "a negated BaseComponent",
        code: `
            import { BaseComponent } from "obsidian";
            declare const component: BaseComponent;
            if (!component) { throw new Error("missing"); }
        `,
        messageId: "conditional",
    },
    {
        name: "a spread component",
        code: `
            import { ButtonComponent } from "obsidian";
            declare const button: ButtonComponent;
            const copy = { ...button };
        `,
        messageId: "spread",
    },
    {
        name: "a filter predicate returning a component",
        code: `
            import { TextComponent } from "obsidian";
            declare const texts: TextComponent[];
            const kept = texts.filter((text) => text);
        `,
        messageId: "predicate",
    },
    {
        name: "a component-returning function assigned to a void-returning variable",
        code: `
            import { ButtonComponent } from "obsidian";
            declare const el: HTMLElement;
            const make: () => void = () => new ButtonComponent(el);
        `,
        messageId: "voidReturnVariable",
    },
    {
        name: "a Setting-returning function returned where a void callback is expected",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            function factory(): () => void {
                return () => new Setting(el);
            }
        `,
        messageId: "voidReturnReturnValue",
    },
    {
        name: "a Setting-returning function in a void-returning property",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            const handlers: { onOpen: () => void } = { onOpen: () => new Setting(el) };
        `,
        messageId: "voidReturnProperty",
    },
];

ruleTester.run("no-misused-promises", noMisusedPromisesRule, {
    valid: [
        ...obsidianChaining.map(({ name, code }) => ({ name: `not reported: ${name}`, code })),
        {
            name: "a Setting chain in a map callback is fine, as upstream",
            code: `
                import { Setting } from "obsidian";
                declare const el: HTMLElement;
                const settings = ["a"].map((name) => new Setting(el).setName(name));
            `,
        },
        {
            name: "any is not thenable, as upstream",
            code: `
                declare const value: any;
                if (value) {}
                ["a"].forEach(() => value);
            `,
        },
        {
            name: "a union of a Setting and a Promise in a condition follows the default flagUnions: none, as for any non-thenable",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting | Promise<void>;
                if (value) {}
            `,
        },
        {
            name: "checksConditionals: false still turns the check off",
            code: `
                declare const promise: Promise<void>;
                if (promise) {}
            `,
            options: [{ checksConditionals: false }],
        },
    ],
    invalid: [
        {
            name: "a real Promise in an if condition",
            code: `
                declare const promise: Promise<void>;
                if (promise) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "an async forEach callback",
            code: `
                ["a"].forEach(async (name) => { await Promise.resolve(name); });
            `,
            errors: [{ messageId: "voidReturnArgument" }],
        },
        {
            name: "a spread Promise",
            code: `
                declare const promise: Promise<{ a: number }>;
                const copy = { ...promise };
            `,
            errors: [{ messageId: "spread" }],
        },
        {
            name: "a user class with its own then",
            code: `
                class Lazy {
                    then(onFulfilled: (value: number) => void): void { onFulfilled(1); }
                }
                declare const lazy: Lazy;
                if (lazy) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a Setting subclass overriding then",
            code: `
                import { Setting } from "obsidian";
                class MySetting extends Setting {
                    override then(cb: (setting: this) => any): this { cb(this); return this; }
                }
                declare const setting: MySetting;
                if (setting) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a then merged into Setting by a module augmentation",
            code: `
                import { Setting } from "obsidian";
                declare module "obsidian" {
                    interface Setting {
                        then<T>(onFulfilled: (value: void) => T): Promise<T>;
                    }
                }
                declare const setting: Setting;
                if (setting) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a then added to a component by a module augmentation",
            code: `
                import { ButtonComponent } from "obsidian";
                declare module "obsidian" {
                    interface ButtonComponent {
                        then<T>(onFulfilled: (value: void) => T): Promise<T>;
                    }
                }
                declare const button: ButtonComponent;
                if (button) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a callback returning a union of a Setting and a Promise",
            code: `
                import { Setting } from "obsidian";
                declare function pick(): Setting | Promise<void>;
                ["a"].forEach(() => pick());
            `,
            errors: [{ messageId: "voidReturnArgument" }],
        },
        {
            name: "a union of a Setting and a Promise in a condition with flagUnions: all",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting | Promise<void>;
                if (value) {}
            `,
            options: [{ checksConditionals: { flagUnions: "all" } }],
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "an intersection of a Setting and a Promise",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting & Promise<void>;
                if (value) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
    ],
});

// The false positive this rule exists for. If typescript-eslint ever stops
// reporting these, this fails and the wrapper can be retired.
ruleTester.run("upstream no-misused-promises on Obsidian's chaining then", upstreamRule, {
    valid: [],
    invalid: obsidianChaining.map(({ name, code, messageId }) => ({
        name: `upstream reports: ${name}`,
        code,
        errors: [{ messageId }],
    })),
});

// Code written for @typescript-eslint/no-misused-promises carries disable
// comments naming it. The recommended config turns that rule off, so they
// suppress nothing, and this rule honours them instead: these run the rule in a
// real Linter, so ESLint's own directive handling and the rule's agree or the
// counts are off.
describe("disable comments naming @typescript-eslint/no-misused-promises", () => {
    const OLD = "@typescript-eslint/no-misused-promises";
    const NEW = "obsidianmd/no-misused-promises";
    const filename = path.join(process.cwd(), "file.ts");

    // The same rule on a SourceCode without getDisableDirectives(), so it reads
    // the comments itself, as on an ESLint without that method.
    const withoutGetDisableDirectives: TSESLint.RuleModule<string, readonly unknown[]> = {
        ...noMisusedPromisesRule,
        create(context) {
            const sourceCode = standIn(context.sourceCode, { getDisableDirectives: undefined });
            return noMisusedPromisesRule.create(standIn(context, { sourceCode }));
        },
    };

    function lint(
        lines: string[],
        {
            rule = noMisusedPromisesRule,
            reportUnusedDisableDirectives = "off",
        }: {
            rule?: TSESLint.RuleModule<string, readonly unknown[]>;
            reportUnusedDisableDirectives?: Linter.StringSeverity;
        } = {},
    ): Linter.LintMessage[] {
        const messages = new Linter().verify(
            lines.join("\n") + "\n",
            [
                {
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
                    linterOptions: { reportUnusedDisableDirectives },
                    plugins: {
                        obsidianmd: { rules: { "no-misused-promises": rule } } as unknown as ESLint.Plugin,
                        "@typescript-eslint": tseslint.plugin,
                    },
                    rules: { [NEW]: "error", [OLD]: "off" },
                },
            ],
            filename,
        );
        assert.deepStrictEqual(messages.filter((m) => m.fatal).map((m) => m.message), []);
        return messages;
    }

    const reportedLines = (messages: Linter.LintMessage[]) =>
        messages.filter((m) => m.ruleId === NEW).map((m) => m.line);

    // `p` is a Promise, so every `if (p) {}` is a misused promise.
    const P = "declare const p: Promise<void>;";
    const USE = "if (p) {}";

    const cases: { name: string; lines: string[]; reported: number[] }[] = [
        {
            name: "eslint-disable-next-line",
            lines: [P, `// eslint-disable-next-line ${OLD}`, USE, USE],
            reported: [4],
        },
        {
            name: "eslint-disable-next-line with a description",
            lines: [P, `// eslint-disable-next-line ${OLD} -- the handler catches`, USE, USE],
            reported: [4],
        },
        {
            name: "eslint-disable-next-line in a block comment",
            lines: [P, `/* eslint-disable-next-line ${OLD} -- reason */`, USE, USE],
            reported: [4],
        },
        {
            name: "a block eslint-disable-next-line over several lines, which applies after its end",
            lines: [P, "/* eslint-disable-next-line", `   ${OLD} -- reason`, "*/", USE, USE],
            reported: [6],
        },
        {
            name: "eslint-disable-next-line listing other rules",
            lines: [
                P,
                `// eslint-disable-next-line no-console, ${OLD}, @typescript-eslint/no-floating-promises -- reason`,
                USE,
                USE,
            ],
            reported: [4],
        },
        {
            name: "eslint-disable-next-line without spaces, with tabs and quotes",
            lines: [
                P,
                `//eslint-disable-next-line ${OLD}`,
                USE,
                `/*eslint-disable-next-line\t "${OLD}" ,no-console\t--\treason*/`,
                USE,
                USE,
            ],
            reported: [6],
        },
        {
            name: "eslint-disable-next-line on a line with code, which leaves that line alone",
            lines: [P, `${USE} // eslint-disable-next-line ${OLD}`, USE, USE],
            reported: [2, 4],
        },
        {
            name: "eslint-disable-line",
            lines: [P, `${USE} // eslint-disable-line ${OLD} -- reason`, USE],
            reported: [3],
        },
        {
            name: "eslint-disable-line in a block comment",
            lines: [P, `${USE} /* eslint-disable-line no-console, ${OLD} */`, USE],
            reported: [3],
        },
        {
            name: "eslint-disable-line where the problem starts on an earlier line, as ESLint",
            lines: [P, '["a"].forEach(async () => {', `}); // eslint-disable-line ${OLD}`],
            reported: [2],
        },
        {
            name: "eslint-disable-line over several lines, which ESLint ignores",
            lines: [P, `${USE} /* eslint-disable-line`, `   ${OLD} */`],
            reported: [2],
        },
        {
            name: "an eslint-disable/eslint-enable range",
            lines: [
                P,
                USE,
                `/* eslint-disable ${OLD} -- legacy */`,
                USE,
                USE,
                `/* eslint-enable ${OLD} */`,
                USE,
            ],
            reported: [2, 7],
        },
        {
            name: "an eslint-disable range listing other rules, closed by an enable listing them",
            lines: [
                P,
                `/* eslint-disable no-console, ${OLD} -- legacy */`,
                USE,
                `/* eslint-enable ${OLD}, no-console */`,
                USE,
            ],
            reported: [5],
        },
        {
            name: "an eslint-disable range closed by a bare eslint-enable",
            lines: [P, `/* eslint-disable ${OLD} */`, USE, "/* eslint-enable */", USE],
            reported: [5],
        },
        {
            name: "an eslint-disable range closed by an enable naming this rule",
            lines: [P, `/* eslint-disable ${OLD} */`, USE, `/* eslint-enable ${NEW} */`, USE],
            reported: [5],
        },
        {
            name: "an eslint-disable range not closed by an enable naming another rule",
            lines: [P, `/* eslint-disable ${OLD} */`, USE, "/* eslint-enable no-console */", USE],
            reported: [],
        },
        {
            name: "an eslint-disable without eslint-enable, to the end of the file",
            lines: [P, `/* eslint-disable ${OLD} */`, USE, USE],
            reported: [],
        },
        {
            name: "an eslint-disable after code on the same line, as ESLint",
            lines: [P, `${USE} /* eslint-disable ${OLD} */`, USE, `/* eslint-disable ${OLD} */ ${USE}`],
            reported: [2],
        },
        {
            name: "a range re-opened after an enable",
            lines: [
                P,
                `/* eslint-disable ${OLD} */`,
                USE,
                `/* eslint-enable ${OLD} */`,
                USE,
                `/* eslint-disable ${OLD} */`,
                USE,
            ],
            reported: [5],
        },
        {
            name: "a disable-next-line inside a range that an enable closes before it",
            lines: [
                P,
                `/* eslint-disable ${OLD} */`,
                `// eslint-disable-next-line ${OLD}`,
                `/* eslint-enable ${OLD} */ ${USE}`,
                USE,
            ],
            reported: [5],
        },
        {
            name: "eslint-disable in a line comment, which is not a directive",
            lines: [P, `// eslint-disable ${OLD}`, USE],
            reported: [3],
        },
        {
            name: "another typescript-eslint rule",
            lines: [
                P,
                "// eslint-disable-next-line @typescript-eslint/no-floating-promises",
                USE,
                `${USE} // eslint-disable-line @typescript-eslint/no-misused-promises-extra`,
                "/* eslint-disable no-misused-promises */",
                USE,
            ],
            reported: [3, 4, 6],
        },
        {
            name: "the rule named only in the description",
            lines: [P, `// eslint-disable-next-line no-console -- not ${OLD}`, USE],
            reported: [3],
        },
        {
            name: "a comment that does not start with the directive",
            lines: [P, `// note: eslint-disable-next-line ${OLD}`, USE],
            reported: [3],
        },
    ];

    for (const [path, rule] of [
        ["getDisableDirectives()", noMisusedPromisesRule],
        ["the comments", withoutGetDisableDirectives],
    ] as const) {
        describe(`read from ${path}`, () => {
            for (const { name, lines, reported } of cases) {
                it(name, () => {
                    assert.deepStrictEqual(reportedLines(lint(lines, { rule })), reported);
                });
            }
        });
    }

    it("still reports the code without the comment", () => {
        assert.deepStrictEqual(reportedLines(lint([P, USE, USE])), [2, 3]);
    });

    describe("with reportUnusedDisableDirectives", () => {
        const unused = (messages: Linter.LintMessage[]) =>
            messages.filter((m) => m.ruleId === null).map((m) => [m.line, m.message]);

        it("ESLint reports the old comment as unused, so authors rename it", () => {
            const messages = lint([P, `// eslint-disable-next-line ${OLD} -- reason`, USE], {
                reportUnusedDisableDirectives: "error",
            });
            assert.deepStrictEqual(reportedLines(messages), []);
            assert.deepStrictEqual(unused(messages), [
                [2, `Unused eslint-disable directive (no problems were reported from '${OLD}').`],
            ]);
            assert.strictEqual(messages.find((m) => m.ruleId === null)?.severity, 2);
        });

        it("ESLint reports an old eslint-disable range as unused, but not its eslint-enable", () => {
            const messages = lint(
                [P, `/* eslint-disable ${OLD} -- reason */`, USE, `/* eslint-enable ${OLD} */`],
                { reportUnusedDisableDirectives: "error" },
            );
            assert.deepStrictEqual(reportedLines(messages), []);
            assert.deepStrictEqual(unused(messages), [
                [2, `Unused eslint-disable directive (no problems were reported from '${OLD}').`],
            ]);
        });

        it("a comment naming this rule still suppresses the problem and is used", () => {
            const messages = lint(
                [
                    P,
                    `// eslint-disable-next-line ${NEW} -- reason`,
                    USE,
                    `${USE} // eslint-disable-line ${NEW}`,
                    `/* eslint-disable ${NEW} */`,
                    USE,
                    `/* eslint-enable ${NEW} */`,
                    "/* eslint-disable */",
                    USE,
                    "/* eslint-enable */",
                ],
                { reportUnusedDisableDirectives: "error" },
            );
            assert.deepStrictEqual(messages, []);
        });

        it("a comment naming both rules is used for this rule, and unused for the old one", () => {
            const messages = lint([P, `// eslint-disable-next-line ${NEW}, ${OLD} -- reason`, USE], {
                reportUnusedDisableDirectives: "error",
            });
            assert.deepStrictEqual(reportedLines(messages), []);
            assert.deepStrictEqual(unused(messages), [
                [2, `Unused eslint-disable directive (no problems were reported from '${OLD}').`],
            ]);
        });

        it("an old comment inside a range disabled for this rule leaves the range used", () => {
            const messages = lint(
                [
                    P,
                    `/* eslint-disable ${NEW} */`,
                    `// eslint-disable-next-line ${OLD}`,
                    USE,
                    `/* eslint-enable ${NEW} */`,
                ],
                { reportUnusedDisableDirectives: "error" },
            );
            assert.deepStrictEqual(reportedLines(messages), []);
            assert.deepStrictEqual(unused(messages), [
                [3, `Unused eslint-disable directive (no problems were reported from '${OLD}').`],
            ]);
        });
    });

    // The recommended config's eslint-comments rules look at the comments, not
    // at what they suppress: an old comment with a description and a paired
    // range raises none of them.
    describe("with the recommended config", () => {
        async function lintRecommended(lines: string[]) {
            const eslint = new ESLint({
                overrideConfigFile: true,
                overrideConfig: [
                    ...plugin.configs.recommended,
                    {
                        files: ["**/*.ts"],
                        languageOptions: {
                            parserOptions: {
                                project: "./tsconfig.json",
                                tsconfigRootDir: process.cwd(),
                                // With CI=true, typescript-eslint otherwise builds the program once
                                // from the files on disk and ignores the code linted here.
                                disallowAutomaticSingleRunInference: true,
                            },
                        },
                    },
                ],
            });
            const [result] = await eslint.lintText(lines.join("\n") + "\n", { filePath: "file.ts" });
            return result.messages;
        }

        it("reports the code without the comments", async () => {
            const messages = await lintRecommended([
                "export async function run(p: Promise<void>): Promise<void> {",
                "    if (p) await p;",
                "}",
            ]);
            assert.deepStrictEqual(messages.map((m) => [m.ruleId, m.line]), [[NEW, 2]]);
        });

        it("suppresses the problem; only the unused-directive report remains", async () => {
            const messages = await lintRecommended([
                "export async function run(p: Promise<void>): Promise<void> {",
                `    // eslint-disable-next-line ${OLD} -- checked by hand`,
                "    if (p) await p;",
                `    /* eslint-disable ${OLD} -- legacy block */`,
                "    if (p) await p;",
                `    /* eslint-enable ${OLD} -- end of the legacy block */`,
                "}",
            ]);
            assert.deepStrictEqual(
                messages.map((m) => [m.ruleId, m.line, m.severity]),
                [
                    [null, 2, 2],
                    [null, 4, 2],
                ],
            );
        });
    });
});

// A stand-in for `target` with some members replaced, or hidden where the
// replacement is `undefined`. ESLint freezes the rule context and SourceCode,
// so a proxy over them could not change their own properties.
function standIn<T extends object>(target: T, overrides: Record<string, unknown>): T {
    return new Proxy(Object.create(Object.getPrototypeOf(target) as object) as T, {
        get(_stand, key) {
            if (Object.hasOwn(overrides, key)) {
                return overrides[key as string];
            }
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
        },
        has(_stand, key) {
            return Object.hasOwn(overrides, key) ? overrides[key as string] !== undefined : key in target;
        },
    });
}
