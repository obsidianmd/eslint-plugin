import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noShellExecution.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-shell-execution", rule, {
	valid: [
		{
			name: "importing obsidian is allowed",
			code: "import { Plugin } from 'obsidian';",
		},
		{
			name: "unrelated function call is allowed",
			code: "const result = someFunction();",
		},
		{
			name: "exec is allowed (not execSync or spawnSync)",
			code: "exec('command');",
		},
	],
	invalid: [
		{
			name: "static import of child_process is forbidden",
			code: "import { exec } from 'child_process';",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "child_process" },
				},
			],
		},
		{
			name: "static import of node:child_process is forbidden",
			code: "import cp from 'node:child_process';",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "node:child_process" },
				},
			],
		},
		{
			name: "require of child_process is forbidden",
			code: "const cp = require('child_process');",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "child_process" },
				},
			],
		},
		{
			name: "dynamic import of child_process is forbidden",
			code: "const cp = await import('child_process');",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "child_process" },
				},
			],
		},
		{
			name: "execSync call is forbidden",
			code: "execSync('ls');",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "execSync()" },
				},
			],
		},
		{
			name: "spawnSync call is forbidden",
			code: "spawnSync('ls');",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "spawnSync()" },
				},
			],
		},
		{
			name: "Platform.isDesktop guard does NOT suppress the report",
			code: "if (Platform.isDesktop) { const cp = await import('child_process'); }",
			errors: [
				{
					messageId: "shellExecution",
					data: { api: "child_process" },
				},
			],
		},
	],
});
