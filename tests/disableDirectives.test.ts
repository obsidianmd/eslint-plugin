import assert from "node:assert";
import { Linter, type Rule } from "eslint";
import tseslint from "typescript-eslint";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { describe, it } from "mocha";
import { disableDirectives, isDisabled, problemStart } from "../lib/disableDirectives.js";

// disableDirectives() and isDisabled() must decide exactly what ESLint decides.
// A rule here reports every `x;`, `y;` and `z;` statement and, for each problem,
// asks isDisabled() whether a directive covers it; ESLint then suppresses what
// its own directive handling covers. The two must agree on every problem, over
// generated files that mix every kind of directive comment, rule list and
// position, on both ways of reading the comments.

type SourceCode = Readonly<TSESLint.SourceCode>;

interface Prediction {
    line: number;
    column: number;
    disabled: boolean;
}

// `x;` is reported at its node, `y;` with a SourceLocation and `z;` with a
// bare position, the three shapes a report descriptor can take.
function reportingRule(predictions: Prediction[], hideGetDisableDirectives: boolean): Rule.RuleModule {
    return {
        meta: { type: "problem", schema: [] },
        create(context) {
            const sourceCode = (
                hideGetDisableDirectives ? standIn(context.sourceCode, { getDisableDirectives: undefined }) : context.sourceCode
            ) as unknown as SourceCode;
            return {
                ExpressionStatement(node) {
                    if (node.expression.type !== "Identifier") {
                        return;
                    }
                    const loc = node.loc!;
                    const name = node.expression.name;
                    const descriptor =
                        name === "x"
                            ? { node, message: name }
                            : name === "y"
                              ? { loc, message: name }
                              : { loc: loc.start, message: name };
                    const start = problemStart(descriptor as unknown as Parameters<typeof problemStart>[0]);
                    predictions.push({
                        ...start,
                        disabled: isDisabled(
                            disableDirectives(sourceCode),
                            start,
                            (ruleId) => ruleId === null || ruleId === context.id,
                        ),
                    });
                    context.report(descriptor);
                },
            };
        },
    };
}

const noop: Rule.RuleModule = { meta: { schema: [] }, create: () => ({}) };

function mismatches(
    code: string,
    parser: "espree" | "typescript",
    hideGetDisableDirectives: boolean,
    totals = { disabled: 0, reported: 0 },
): string[] {
    const predictions: Prediction[] = [];
    const linter = new Linter();
    const messages = linter.verify(
        code,
        [
            {
                files: ["**/*.js", "**/*.ts"],
                ...(parser === "typescript" ? { languageOptions: { parser: tseslint.parser } } : {}),
                linterOptions: { reportUnusedDisableDirectives: "off" },
                plugins: {
                    test: { rules: { r: reportingRule(predictions, hideGetDisableDirectives), other: noop } },
                },
                rules: { "test/r": "error" },
            },
        ],
        parser === "typescript" ? "file.ts" : "file.js",
    );
    const fatal = messages.filter((m) => m.fatal);
    assert.deepStrictEqual(fatal.map((m) => m.message), [], code);
    const reported = new Set(messages.filter((m) => m.ruleId === "test/r").map((m) => `${m.line}:${m.column}`));
    // Linter has getSuppressedMessages() at runtime; ESLint's types don't declare it.
    const suppressedMessages = (
        linter as Linter & { getSuppressedMessages(): Linter.SuppressedLintMessage[] }
    ).getSuppressedMessages();
    const suppressed = new Set(
        suppressedMessages.filter((m) => m.ruleId === "test/r").map((m) => `${m.line}:${m.column}`),
    );
    assert.strictEqual(reported.size + suppressed.size, predictions.length, code);
    totals.disabled += suppressed.size;
    totals.reported += reported.size;
    return predictions
        .filter(({ line, column, disabled }) => disabled !== suppressed.has(`${line}:${column}`))
        .map(({ line, column, disabled }) => `${line}:${column} predicted ${disabled ? "disabled" : "reported"}`);
}

// A small seeded generator, so every run lints the same files.
function generator(seed: number) {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
    return { next, pick };
}

const RULES = ["test/r", "test/other", "test/missing", '"test/r"'];

function generateFile(seed: number): string {
    const { next, pick } = generator(seed);
    const list = () => {
        if (next() < 0.3) {
            return "";
        }
        const count = 1 + Math.floor(next() * 2);
        return Array.from({ length: count }, () => pick(RULES)).join(next() < 0.5 ? ", " : ",");
    };
    const reason = () => (next() < 0.2 ? " -- reason" : "");
    const block = () =>
        pick([
            () => `/* eslint-disable ${list()}${reason()} */`,
            () => `/* eslint-enable ${list()}${reason()} */`,
            () => `/* eslint-disable-line ${list()} */`,
            () => `/* eslint-disable-next-line ${list()}${reason()} */`,
            () => `/*eslint-disable-next-line ${list()}*/`,
            // Over several lines: a disable-next-line applies after its end, and
            // ESLint ignores a disable-line.
            () => `/* eslint-disable-next-line\n   ${list()} */`,
            () => `/* eslint-disable-line\n   ${list()} */`,
            () => `/* eslint-disable\n   ${list()} */`,
            () => `/* eslint-enable\n   ${list()} */`,
            () => "/* not eslint-disable */",
            // Other directives, which disable nothing.
            () => pick(["/* global */", "/* global test/r */", "/* exported */", "/* eslint test/other: off */"]),
        ])();
    const line = () =>
        pick([
            () => `// eslint-disable-line ${list()}${reason()}`,
            () => `// eslint-disable-next-line ${list()}${reason()}`,
            () => `//eslint-disable-next-line ${list()}`,
            // Line comments cannot open or close a range.
            () => `// eslint-disable ${list()}`,
            () => `// eslint-enable ${list()}`,
            () => `// note: eslint-disable-line ${list()}`,
        ])();
    const lines: string[] = [];
    // A shebang is never a directive, even one that reads like one.
    if (next() < 0.1) {
        lines.push(pick(["#!eslint-disable", "#! eslint-disable-next-line test/r", "#!/usr/bin/env node"]));
    }
    const lineCount = 4 + Math.floor(next() * 8);
    for (let i = 0; i < lineCount; i++) {
        const items: string[] = [];
        const itemCount = Math.floor(next() * 4);
        for (let j = 0; j < itemCount; j++) {
            const kind = next();
            items.push(
                kind < 0.4
                    ? pick(["x;", "y;", "z;"])
                    : // A comment right after the start of the problem, inside it.
                      kind < 0.5
                      ? `${pick(["x", "y", "z"])}${block()};`
                      : block(),
            );
        }
        if (next() < 0.3) {
            items.push(line());
        }
        lines.push(items.join(next() < 0.7 ? " " : ""));
    }
    return lines.join("\n") + "\n";
}

describe("disable directives read as ESLint reads them", () => {
    for (const { parser, files } of [
        { parser: "espree", files: 300 },
        { parser: "typescript", files: 60 },
    ] as const) {
        for (const [source, hide] of [
            ["getDisableDirectives()", false],
            ["the comments", true],
        ] as const) {
            it(`agree with ESLint on ${files} generated files (${parser}, read from ${source})`, () => {
                const failures: string[] = [];
                const totals = { disabled: 0, reported: 0 };
                for (let seed = 1; seed <= files; seed++) {
                    const code = generateFile(seed);
                    const wrong = mismatches(code, parser, hide, totals);
                    if (wrong.length > 0) {
                        failures.push(`seed ${seed}: ${wrong.join(", ")}\n${code}`);
                    }
                }
                assert.deepStrictEqual(failures, []);
                // The files exercise both outcomes, not one of them only.
                assert.ok(totals.disabled > files / 2 && totals.reported > files / 2, JSON.stringify(totals));
            });
        }
    }

    // Hand-written layouts that the generated files may miss.
    const layouts: { name: string; lines: string[] }[] = [
        {
            name: "a disable-line and a disable-next-line in one line, listed in either order",
            lines: [
                "x; /* eslint-disable-next-line test/r */ // eslint-disable-line test/r",
                "x;",
                "x;",
            ],
        },
        {
            name: "a range opened right after a problem on the same line",
            lines: ["x;/* eslint-disable test/r */x;", "x;", "/* eslint-enable */x;"],
        },
        {
            name: "an enable for the rule after a bare disable",
            lines: ["/* eslint-disable */", "x;", "/* eslint-enable test/r */", "x;", "/* eslint-enable */", "x;"],
        },
        {
            name: "an enable for another rule inside a range",
            lines: ["/* eslint-disable test/r, test/other */", "/* eslint-enable test/other */", "x;"],
        },
        {
            name: "a multi-line disable-next-line followed by code on its last line",
            lines: ["/* eslint-disable-next-line", "   test/r */ x;", "x;", "x;"],
        },
    ];
    for (const { name, lines } of layouts) {
        it(name, () => {
            const code = lines.join("\n") + "\n";
            for (const parser of ["espree", "typescript"] as const) {
                for (const hide of [false, true]) {
                    assert.deepStrictEqual(mismatches(code, parser, hide), [], `${parser}, hidden: ${hide}`);
                }
            }
        });
    }
});

describe("problemStart", () => {
    const node = { loc: { start: { line: 3, column: 4 }, end: { line: 3, column: 9 } } } as TSESTree.Node;

    it("reads the node's start, with a 1-based column", () => {
        assert.deepStrictEqual(problemStart({ node, messageId: "m" }), { line: 3, column: 5 });
    });

    it("prefers loc over the node, as a SourceLocation or a bare position", () => {
        assert.deepStrictEqual(
            problemStart({ node, loc: { start: { line: 7, column: 0 }, end: { line: 8, column: 2 } }, messageId: "m" }),
            { line: 7, column: 1 },
        );
        assert.deepStrictEqual(problemStart({ node, loc: { line: 9, column: 2 }, messageId: "m" }), {
            line: 9,
            column: 3,
        });
    });
});

describe("disableDirectives", () => {
    it("reads a SourceCode's directives once", () => {
        let reads = 0;
        const sourceCode = {
            getDisableDirectives() {
                reads++;
                return { directives: [] };
            },
        } as unknown as SourceCode;
        const first = disableDirectives(sourceCode);
        assert.strictEqual(disableDirectives(sourceCode), first);
        assert.strictEqual(reads, 1);
    });
});

// A stand-in for `target` with some members replaced, or hidden where the
// replacement is `undefined`. ESLint freezes SourceCode, so a proxy over it
// could not change its own properties.
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
