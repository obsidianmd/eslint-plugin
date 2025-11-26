import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

RuleTester.afterAll = globalThis.after;
RuleTester.describe = globalThis.describe;
RuleTester.it = globalThis.it;

export const typedRuleTesterConfig: RuleTesterConfig = {
    languageOptions: {
        parser,
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: {
            project: "./tsconfig.json",
            tsconfigRootDir: process.cwd(),
            extraFileExtensions: [".json"],
        },
    },
};

RuleTester.setDefaultConfig(typedRuleTesterConfig);
