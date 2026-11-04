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
// thousands), so the rule's time grew as references x variables. By name it
// stays a few milliseconds per thousand references; the limit leaves room for
// a loaded machine.
const LIMIT_MS = 500;
const VARIABLES = 30_000;
const REFERENCES = 5_000;

function ruleTime(name: string, rule: unknown, reference: string): number {
    const lines: string[] = [];
    for (let i = 0; i < VARIABLES; i++) lines.push(`const v${i} = ${i};`);
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

describe("rules that look up a global by name, in a file with many variables", function () {
    this.timeout(60_000);

    it("prefer-active-doc", () => {
        const ms = ruleTime("prefer-active-doc", preferActiveDoc, `document.title = "x";`);
        assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
    });

    it("no-global-this", () => {
        const ms = ruleTime("no-global-this", noGlobalThis, `globalThis.x = 1;`);
        assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
    });

    it("prefer-window-timers", () => {
        const ms = ruleTime("prefer-window-timers", preferWindowTimers, `setTimeout(() => {}, 1);`);
        assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
    });
});
