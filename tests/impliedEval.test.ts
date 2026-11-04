import assert from "node:assert";
import { ESLint, type Linter } from "eslint";
import plugin from "../lib/index.js";

// Implied eval is reported once per file. In TypeScript files
// @typescript-eslint/no-implied-eval (from recommendedTypeChecked) reports it,
// and the core no-implied-eval, which typescript-eslint's configs turn off
// where theirs runs, stays off. JavaScript files have no type information, so
// the core rule reports it there.
const IMPLIED_EVAL_RULES = ["no-implied-eval", "@typescript-eslint/no-implied-eval"];

for (const configName of ["recommended", "recommendedWithLocalesEn"] as const) {
    describe(`implied eval is reported once (${configName})`, () => {
        async function lint(filePath: string): Promise<(string | null)[]> {
            const eslint = new ESLint({
                overrideConfigFile: true,
                overrideConfig: [
                    ...plugin.configs[configName],
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
            const code = 'window.setTimeout("alert(1)", 1);\n';
            const [result] = await eslint.lintText(code, { filePath });
            assert.deepStrictEqual(result.messages.filter((m) => m.fatal).map((m) => m.message), []);
            return result.messages.filter((m) => m.ruleId !== null && IMPLIED_EVAL_RULES.includes(m.ruleId)).map((m) => m.ruleId);
        }

        it("by @typescript-eslint/no-implied-eval in a TypeScript file", async () => {
            assert.deepStrictEqual(await lint("file.ts"), ["@typescript-eslint/no-implied-eval"]);
        });

        it("by no-implied-eval in a JavaScript file", async () => {
            assert.deepStrictEqual(await lint("src/main.js"), ["no-implied-eval"]);
        });

        async function severities(filePath: string): Promise<(string | undefined)[]> {
            const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs[configName] });
            const config = (await eslint.calculateConfigForFile(filePath)) as Linter.Config;
            const rules = config.rules ?? {};
            return IMPLIED_EVAL_RULES.map((rule) => {
                const entry = rules[rule];
                const level = Array.isArray(entry) ? entry[0] : entry;
                return typeof level === "number" ? ["off", "warn", "error"][level] : level;
            });
        }

        for (const filePath of ["src/main.ts", "src/view.tsx", "src/a.mts", "src/a.cts"]) {
            it(`only the typescript-eslint rule is on for ${filePath}`, async () => {
                assert.deepStrictEqual(await severities(filePath), ["off", "error"]);
            });
        }

        for (const filePath of ["src/main.js", "src/view.jsx", "src/a.mjs", "src/a.cjs"]) {
            it(`only the core rule is on for ${filePath}`, async () => {
                assert.deepStrictEqual(await severities(filePath), ["error", undefined]);
            });
        }
    });
}
