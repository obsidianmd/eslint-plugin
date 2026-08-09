import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/vaultRead.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-vault-read", rule, {
	valid: [
		{
			name: "read on unrelated object is allowed",
			code: "file.read();",
		},
		{
			name: "vault.create is allowed",
			code: "vault.create('test.md', 'content');",
		},
		{
			name: "stream.read is allowed",
			code: "stream.read();",
		},
	],
	invalid: [
		{
			name: "vault.read is flagged",
			code: "vault.read('test.md');",
			errors: [
				{
					messageId: "vaultRead",
					data: { api: "vault.read()" },
				},
			],
		},
		{
			name: "vault.cachedRead is flagged",
			code: "vault.cachedRead('test.md');",
			errors: [
				{
					messageId: "vaultRead",
					data: { api: "vault.cachedRead()" },
				},
			],
		},
		{
			name: "this.app.vault.read is flagged",
			code: "this.app.vault.read('test.md');",
			errors: [
				{
					messageId: "vaultRead",
					data: { api: "vault.read()" },
				},
			],
		},
		{
			name: "adapter.read is flagged",
			code: "adapter.read('test.md');",
			errors: [
				{
					messageId: "vaultRead",
					data: { api: "adapter.read()" },
				},
			],
		},
		{
			name: "app.vault.cachedRead is flagged",
			code: "app.vault.cachedRead('test.md');",
			errors: [
				{
					messageId: "vaultRead",
					data: { api: "vault.cachedRead()" },
				},
			],
		},
	],
});
