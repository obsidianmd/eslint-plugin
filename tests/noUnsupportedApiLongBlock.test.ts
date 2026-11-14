import assert from "node:assert";
import path from "node:path";
import { Linter } from "eslint";
import type { Rule } from "eslint";
import tseslint from "typescript-eslint";
import rule from "../lib/rules/noUnsupportedApi.js";

// For each API it would report, no-unsupported-api looks for an earlier
// `if (!requireApiVersion(...)) return;` in every statement list around the
// call. Going over the statements before the call in each list made the rule
// quadratic in a long list that calls many such APIs: a generated file, or a
// plugin whose minAppVersion is far behind the APIs it uses. The list's early
// exits are read once instead. The same calls are linted as one long list and
// as many short ones, which a linear rule takes the same time for and a
// quadratic one LISTS times as long; comparing the two rather than taking a
// fixed limit keeps a loaded machine from failing it. The second lint of each
// text reuses its type information, so the rule's time is its own work.
const STATEMENTS = 16_000;
const LISTS = 16;
const MAX_RATIO = 3;

function source(lists: number): string {
    const lines = ['import { App, TFile } from "obsidian";'];
    for (let list = 0; list < lists; list++) {
        lines.push(`export async function run${list}(app: App, file: TFile): Promise<void> {`);
        for (let i = 0; i < STATEMENTS / lists; i++) lines.push("    await app.fileManager.trashFile(file);");
        lines.push("}");
    }
    return lines.join("\n");
}

describe("no-unsupported-api in a long statement list", function () {
    this.timeout(240_000);

    it("takes time linear in the statements", () => {
        const config: Linter.Config[] = [
            {
                files: ["**/*.ts"],
                languageOptions: {
                    parser: tseslint.parser,
                    // Under CI=true typescript-eslint would otherwise read file.ts
                    // from disk rather than the text linted here.
                    parserOptions: {
                        project: "./tsconfig.json",
                        tsconfigRootDir: process.cwd(),
                        disallowAutomaticSingleRunInference: true,
                    },
                },
                plugins: { obsidianmd: { rules: { "no-unsupported-api": rule as unknown as Rule.RuleModule } } },
                // trashFile() is @since 1.6.6.
                rules: { "obsidianmd/no-unsupported-api": ["error", { minAppVersion: "1.0.0" }] },
            },
        ];
        const linter = new Linter({ configType: "flat" });
        // Linter#verify() keeps no times; verifyAndFix() without fixing does. It
        // takes `stats` at runtime, which its FixOptions type does not declare.
        const options: Linter.FixOptions & { stats: boolean } = {
            filename: path.join(process.cwd(), "file.ts"),
            stats: true,
            fix: false,
        };
        const ruleTime = (text: string) => {
            linter.verifyAndFix(text, config, options);
            const { messages } = linter.verifyAndFix(text, config, options);
            assert.strictEqual(messages.length, STATEMENTS, JSON.stringify(messages[0]));
            return linter.getTimes().passes[0].rules?.["obsidianmd/no-unsupported-api"]?.total ?? 0;
        };
        const short = ruleTime(source(LISTS));
        const long = ruleTime(source(1));
        assert.ok(long < short * MAX_RATIO, `took ${long.toFixed(0)} ms in one list, ${short.toFixed(0)} ms in ${LISTS}`);
    });
});
