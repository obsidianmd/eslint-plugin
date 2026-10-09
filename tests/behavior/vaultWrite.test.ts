import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/vaultWrite.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-vault-write", rule, {
	valid: [
		{
			name: "vault.read is not a write method",
			code: "vault.read('test.md')",
		},
		{
			name: "non-vault object calling create is allowed",
			code: "file.create('test.md')",
		},
		{
			name: "vault.getAbstractFileByPath is not a write method",
			code: "vault.getAbstractFileByPath('test.md')",
		},
	],
	invalid: [
		{
			name: "vault.create is a write operation",
			code: "vault.create('test.md', 'content')",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.create()" } }],
		},
		{
			name: "vault.modify is a write operation",
			code: "vault.modify(file, 'new content')",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.modify()" } }],
		},
		{
			name: "vault.delete is a write operation",
			code: "vault.delete(file)",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.delete()" } }],
		},
		{
			name: "vault.rename is a write operation",
			code: "vault.rename(file, 'new.md')",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.rename()" } }],
		},
		{
			name: "vault.copy is a write operation",
			code: "vault.copy(file, 'copy.md')",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.copy()" } }],
		},
		{
			name: "vault.trash is a write operation",
			code: "vault.trash(file, true)",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.trash()" } }],
		},
		{
			name: "adapter.write is a write operation",
			code: "adapter.write('path', 'data')",
			errors: [{ messageId: "vaultWrite", data: { api: "adapter.write()" } }],
		},
		{
			name: "this.app.vault.modify is detected via member expression",
			code: "this.app.vault.modify(file, 'content')",
			errors: [{ messageId: "vaultWrite", data: { api: "vault.modify()" } }],
		},
	],
});
