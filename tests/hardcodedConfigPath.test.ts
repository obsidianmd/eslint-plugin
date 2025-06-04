import { RuleTester } from "@typescript-eslint/rule-tester";
import hardcodedConfigPathRule from "../lib/rules/hardcodedConfigPath.js";

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
