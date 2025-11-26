import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

import { after, describe, it } from "mocha";

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

export function mochaHooks() {
    RuleTester.afterAll = after;
    RuleTester.describe = describe;
    RuleTester.it = it;

    RuleTester.setDefaultConfig(typedRuleTesterConfig);
}
