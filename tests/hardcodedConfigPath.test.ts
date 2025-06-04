import { RuleTester } from "@typescript-eslint/rule-tester";
import hardcodedConfigPathRule from "../lib/rules/hardcodedConfigPath.js";

// NOTE: Type-aware linting is skipped due to lack of support in ESLint v9+ and @typescript-eslint/rule-tester as of June 2025.
const ruleTester = new RuleTester();

ruleTester.run("hardcoded-config-path", hardcodedConfigPathRule, {
	valid: [{ code: 'const config = ".config";' }],
	invalid: [
		{
			code: 'const config = ".obsidian";',
			errors: [{ messageId: "configPath" }],
		},
	],
});
