import { RuleTester } from "@typescript-eslint/rule-tester";
import preferFileManagerTrashRule from "../lib/rules/preferFileManagerTrashFile.js";
const ruleTester = new RuleTester();
ruleTester.run("prefer-file-manager-trash-file", preferFileManagerTrashRule, {
    valid: [
        {
            name: "FileManager.trashFile is allowed",
            code: `
                declare class FileManager { trashFile(file: unknown): void; }
                declare const fileManager: FileManager;
                fileManager.trashFile(someFile);
            `,
        },
        {
            name: "delete on non-Vault object is allowed",
            code: `
                const mySet = new Set();
                mySet.delete(1);
            `,
        },
        {
            name: "other Vault methods are allowed",
            code: `
                declare class Vault { create(path: string, data: string): void; }
                declare const vault: Vault;
                vault.create('file.md', '');
            `,
        },
    ],
    invalid: [
        {
            name: "vault.trash is forbidden",
            code: `
                declare class Vault { trash(file: unknown): void; }
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
            name: "vault.delete is forbidden",
            code: `
                declare class Vault { delete(file: unknown): void; }
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
        {
            name: "app.vault.trash is forbidden",
            code: `
                declare class Vault { trash(file: unknown): void; }
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
        {
            name: "intermediate variable holding vault with delete is forbidden",
            code: `
                declare class Vault { delete(file: unknown): void; }
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
