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
        {
            name: "the adapter's remove is not reported",
            code: `
                declare class DataAdapter { remove(path: string): Promise<void>; }
                declare class Vault { adapter: DataAdapter; }
                declare const vault: Vault;
                vault.adapter.remove('file.md');
            `,
        },
        {
            name: "a function named trash or delete is not a Vault method",
            code: `
                declare function trash(file: unknown): void;
                trash(someFile);
            `,
        },
        {
            name: "a computed method named by a variable is not reported",
            code: `
                declare class Vault { trash(file: unknown): void; delete(file: unknown): void; read(file: unknown): void; }
                declare const vault: Vault;
                const trash = "read";
                const method: "read" | "delete" = Math.random() > 1 ? "delete" : "read";
                vault[trash](someFile);
                vault[method](someFile);
            `,
        },
        {
            name: "delete on a nullable non-Vault object is allowed",
            code: `
                declare const cache: Map<string, number> | null;
                declare const seen: Set<string> | undefined;
                cache?.delete('file.md');
                seen?.delete('file.md');
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
                    // The method name, not the call.
                    line: 4,
                    column: 23,
                    endColumn: 28,
                },
            ],
        },
        {
            name: "Obsidian's own Vault.trash and Vault.delete are forbidden",
            code: `
                import { TFile, Vault } from "obsidian";
                declare const vault: Vault;
                declare const file: TFile;
                void vault.trash(file, true);
                void vault.delete(file);
            `,
            errors: [
                { messageId: "preferTrashFile", data: { methodName: "trash" }, line: 5 },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 6 },
            ],
        },
        {
            name: "a computed method with the name spelled out is forbidden",
            code: `
                declare class Vault { trash(file: unknown): void; delete(file: unknown): void; }
                declare const vault: Vault;
                vault["trash"](someFile);
                vault[\`delete\`](someFile);
            `,
            errors: [
                { messageId: "preferTrashFile", data: { methodName: "trash" }, line: 4, column: 23, endColumn: 30 },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 5 },
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
        {
            name: "a Vault parameter is found by type",
            code: `
                declare class Vault { delete(file: unknown): Promise<void>; }
                async function remove(v: Vault, file: unknown) {
                    await v.delete(file);
                }
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" } }],
        },
        // A union with null or undefined has no symbol of its own, so these
        // were never reported.
        {
            name: "a vault that may be null is found by type",
            code: `
                declare class Vault { delete(file: unknown): Promise<void>; }
                declare const mv: Vault | null;
                mv?.delete(someFile);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" } }],
        },
        {
            name: "an optional vault property is found by type",
            code: `
                declare class Vault { trash(file: unknown, system: boolean): Promise<void>; }
                declare const app: { vault?: Vault };
                app.vault?.trash(someFile, true);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "trash" } }],
        },
        {
            name: "a vault read through an optional chain is found by type",
            code: `
                declare class Vault { delete(file: unknown): Promise<void>; }
                declare const plugin: { app: { vault: Vault } } | undefined;
                plugin?.app.vault.delete(someFile);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" } }],
        },
    ],
});
