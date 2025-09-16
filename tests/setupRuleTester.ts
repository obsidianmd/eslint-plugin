import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

declare global {
	// Extend NodeJS.Global with afterAll for type safety
	namespace NodeJS {
		interface Global {
			afterAll?: () => void;
		}
	}
}

// Patch for @typescript-eslint/rule-tester: define global afterAll if missing
if (typeof (global as NodeJS.Global).afterAll !== "function") {
	(global as NodeJS.Global).afterAll = () => {};
}

RuleTester.afterAll = () => {};
RuleTester.describe = (text, fn) => fn();
RuleTester.it = (text, fn) => fn();

// Set up RuleTester to use @typescript-eslint/parser globally
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
