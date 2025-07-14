import { RuleTester } from "@typescript-eslint/rule-tester";
import hardcodedConfigPathRule from "../lib/rules/hardcodedConfigPath.js";

const ruleTester = new RuleTester();

ruleTester.run("hardcoded-config-path", hardcodedConfigPathRule, {
	valid: [
		{ code: 'const config = ".config";' },
		{ code: 'const config = ".obsidian-cache";' },
		{ code: 'const config = ".obsidianCache";' },
	],
	invalid: [
		{
			code: 'const config = ".obsidian";',
			errors: [{ messageId: "configPath" }],
		},
		{
			code: 'const config = ".obsidian/workspace.json";',
			errors: [{ messageId: "configPath" }],
		},
	],
});
