import { RuleTester } from "@typescript-eslint/rule-tester";
import preferFileManagerTrashRule from "../lib/rules/preferFileManagerTrashFile.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-file-manager-trash-file", preferFileManagerTrashRule, {
	valid: [
		// Correct usage
		{
			code: `
                declare class FileManager { trashFile(file: any): void; }
                declare const fileManager: FileManager;
                fileManager.trashFile(someFile);
            `,
		},
		// Calling delete on a non-Vault object is fine
		{
			code: `
                const mySet = new Set();
                mySet.delete(1);
            `,
		},
		// Calling other methods on Vault is fine
		{
			code: `
                declare class Vault { create(path: string, data: string): void; }
                declare const vault: Vault;
                vault.create('file.md', '');
            `,
		},
	],
	invalid: [
		// Basic invalid cases
		{
			code: `
                declare class Vault { trash(file: any): void; }
                declare const vault: Vault;
                vault.trash(someFile);
            `,
			errors: [
				{
					messageId: "preferTrashFile",
					data: { methodName: "trash" },
				},
			],
		},
		{
			code: `
                declare class Vault { delete(file: any): void; }
                declare const vault: Vault;
                vault.delete(someFile);
            `,
			errors: [
				{
					messageId: "preferTrashFile",
					data: { methodName: "delete" },
				},
			],
		},
		// A more realistic plugin scenario
		{
			code: `
                declare class Vault { trash(file: any): void; }
                declare class App { vault: Vault; }
                declare const app: App;
                app.vault.trash(someFile);
            `,
			errors: [
				{
					messageId: "preferTrashFile",
					data: { methodName: "trash" },
				},
			],
		},
		// Test with an intermediate variable
		{
			code: `
                declare class Vault { delete(file: any): void; }
                declare const myVault: Vault;
                const v = myVault;
                v.delete(someFile);
            `,
			errors: [
				{
					messageId: "preferTrashFile",
					data: { methodName: "delete" },
				},
			],
		},
	],
});
