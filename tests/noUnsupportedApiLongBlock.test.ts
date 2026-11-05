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
// exits are read once instead. The second lint of the same text reuses the
// type information, so the rule's time is its own work; the limit leaves room
// for a loaded machine.
const LIMIT_MS = 1000;
const STATEMENTS = 16_000;

describe("no-unsupported-api in a long statement list", function () {
    this.timeout(120_000);

    it("takes time linear in the statements", () => {
        const lines = ['import { App, TFile } from "obsidian";', "export async function run(app: App, file: TFile): Promise<void> {"];
        for (let i = 0; i < STATEMENTS; i++) lines.push("    await app.fileManager.trashFile(file);");
        lines.push("}");
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
        const lint = () => linter.verifyAndFix(lines.join("\n"), config, options);
        lint();
        const { messages } = lint();
        assert.strictEqual(messages.length, STATEMENTS, JSON.stringify(messages[0]));
        const ms = linter.getTimes().passes[0].rules?.["obsidianmd/no-unsupported-api"]?.total ?? 0;
        assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
    });
});
