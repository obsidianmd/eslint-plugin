import assert from "node:assert";
import { Linter } from "eslint";
import type { Rule } from "eslint";
import noGlobalThis from "../lib/rules/noGlobalThis.js";
import preferActiveDoc from "../lib/rules/preferActiveDoc.js";
import preferWindowTimers from "../lib/rules/preferWindowTimers.js";

// Each rule looks up the global it reports (`document`, `globalThis`, a timer
// function) in the scopes around each reference, to skip a local binding of
// that name. Searching each scope's list of variables rather than its map of
// names costs, for every reference, the number of variables declared in the
// file's module scope (a bundle or a generated file can declare tens of
// thousands), so the rule's time grew as references x variables. By name, the
// variables add little to the time the references take. The same references
// are linted beside few and many variables and the two times compared, rather
// than either held to a fixed limit, so that a loaded machine, which slows
// both, does not fail it. Each time is the fastest of a few runs.
const FEW_VARIABLES = 100;
const MANY_VARIABLES = 30_000;
const REFERENCES = 20_000;
const RUNS = 3;
const MAX_RATIO = 3;

function ruleTime(name: string, rule: unknown, reference: string, variables: number): number {
    const lines: string[] = [];
    for (let i = 0; i < variables; i++) lines.push(`const v${i} = ${i};`);
    for (let i = 0; i < REFERENCES; i++) lines.push(reference);
    const linter = new Linter({ configType: "flat" });
    // Linter#verify() keeps no times; verifyAndFix() without fixing does. It
    // takes `stats` at runtime, which its FixOptions type does not declare.
    const options: Linter.FixOptions & { stats: boolean } = { filename: "file.js", stats: true, fix: false };
    const { messages } = linter.verifyAndFix(
        lines.join("\n"),
        [
            {
                languageOptions: { sourceType: "module", globals: { document: "readonly", globalThis: "readonly", setTimeout: "readonly" } },
                plugins: { obsidianmd: { rules: { [name]: rule as Rule.RuleModule } } },
                rules: { [`obsidianmd/${name}`]: "warn" },
            },
        ],
        options,
    );
    assert.strictEqual(messages.length, REFERENCES, "every reference is reported");
    const pass = linter.getTimes().passes[0];
    return pass.rules?.[`obsidianmd/${name}`]?.total ?? 0;
}

function assertTimeIndependentOfVariables(name: string, rule: unknown, reference: string): void {
    let few = Infinity;
    let many = Infinity;
    for (let run = 0; run < RUNS; run++) {
        few = Math.min(few, ruleTime(name, rule, reference, FEW_VARIABLES));
        many = Math.min(many, ruleTime(name, rule, reference, MANY_VARIABLES));
    }
    assert.ok(
        many < few * MAX_RATIO,
        `took ${many.toFixed(0)} ms beside ${MANY_VARIABLES} variables, ${few.toFixed(0)} ms beside ${FEW_VARIABLES}`,
    );
}

describe("rules that look up a global by name, in a file with many variables", function () {
    this.timeout(300_000);

    it("prefer-active-doc", () => {
        assertTimeIndependentOfVariables("prefer-active-doc", preferActiveDoc, `document.title = "x";`);
    });

    it("no-global-this", () => {
        assertTimeIndependentOfVariables("no-global-this", noGlobalThis, `globalThis.x = 1;`);
    });

    it("prefer-window-timers", () => {
        assertTimeIndependentOfVariables("prefer-window-timers", preferWindowTimers, `setTimeout(() => {}, 1);`);
    });
});
