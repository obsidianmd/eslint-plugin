import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/vaultEnumeration.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-vault-enumeration", rule, {
	valid: [
		{
			name: "vault.read is not enumeration",
			code: "vault.read('test.md')",
		},
		{
			name: "vault.getAbstractFileByPath is a single file lookup",
			code: "vault.getAbstractFileByPath('test.md')",
		},
		{
			name: "non-vault object calling getFiles is allowed",
			code: "files.getFiles()",
		},
	],
	invalid: [
		{
			name: "vault.getFiles enumerates all files",
			code: "vault.getFiles()",
			errors: [{ messageId: "vaultEnumeration", data: { api: "vault.getFiles()" } }],
		},
		{
			name: "vault.getAllLoadedFiles enumerates all files",
			code: "vault.getAllLoadedFiles()",
			errors: [{ messageId: "vaultEnumeration", data: { api: "vault.getAllLoadedFiles()" } }],
		},
		{
			name: "vault.recurseChildren enumerates all files",
			code: "vault.recurseChildren(folder)",
			errors: [{ messageId: "vaultEnumeration", data: { api: "vault.recurseChildren()" } }],
		},
		{
			name: "this.app.vault.getFiles enumerates via member expression",
			code: "this.app.vault.getFiles()",
			errors: [{ messageId: "vaultEnumeration", data: { api: "vault.getFiles()" } }],
		},
		{
			name: "getMarkdownFiles on any object enumerates markdown files",
			code: "something.getMarkdownFiles()",
			errors: [{ messageId: "vaultEnumeration", data: { api: "*.getMarkdownFiles()" } }],
		},
		{
			name: "this.app.vault.getMarkdownFiles enumerates markdown files",
			code: "this.app.vault.getMarkdownFiles()",
			errors: [{ messageId: "vaultEnumeration", data: { api: "*.getMarkdownFiles()" } }],
		},
	],
});
