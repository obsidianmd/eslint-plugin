import { RuleTester } from "@typescript-eslint/rule-tester";
import preferFileManagerTrashRule from "../lib/rules/preferFileManagerTrashFile.js";

const ruleTester = new RuleTester();

// FileManager.trashFile() came with Obsidian 1.6.6. This repo's manifest.json
// says 0.15.0, below which nothing is reported, so the version is given as an
// option.
const since = [{ minAppVersion: "1.6.6" }] as const;

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
        {
            name: "below 1.6.6, as this repo's manifest.json (0.15.0) is, there is no trashFile() and nothing is reported",
            code: `
                import { TFile, Vault } from "obsidian";
                declare const vault: Vault;
                declare const file: TFile;
                void vault.trash(file, true);
                void vault.delete(file);
            `,
        },
        {
            name: "below 1.6.6 by the option",
            code: "declare class Vault { delete(file: unknown): void; } declare const vault: Vault; vault.delete(someFile);",
            options: [{ minAppVersion: "1.6.5" }],
        },
        {
            // obsidian-local-images-plus, obsidian-full-calendar, links.
            name: "a second argument to trash() that is not a literal: the caller chooses where the file goes",
            code: `
                declare class Vault { trash(file: unknown, system: boolean): void; }
                declare const vault: Vault;
                declare function useSystem(): boolean;
                vault.trash(someFile, useSysTrash);
                vault.trash(someFile, this.settings.systemTrash);
                vault.trash(someFile, useSystem());
            `,
            options: since,
        },
        {
            // file-cleaner-redux, folder-notes, oz-clear-unused-images, make-md.
            name: "a switch whose cases delete in different ways is the plugin's own deletion setting",
            code: `
                declare class Vault { trash(file: unknown, system: boolean): Promise<void>; delete(file: unknown, force?: boolean): Promise<void>; }
                declare const app: { vault: Vault; fileManager: { trashFile(file: unknown): Promise<void> } };
                async function remove(file: unknown, option: string) {
                    switch (option) {
                        case "permanent":
                            await app.vault.delete(file, true);
                            break;
                        case "system-trash":
                            await app.vault.trash(file, true);
                            break;
                        case "trash":
                            await app.vault.trash(file, false);
                            break;
                        case "obsidian":
                            await app.fileManager.trashFile(file);
                            break;
                    }
                }
            `,
            options: since,
        },
        {
            // file-tree-alternative, remove-empty-assets.
            name: "an if/else if chain or a ?: that deletes in different ways is the plugin's own deletion setting",
            code: `
                declare class Vault { trash(file: unknown, system: boolean): Promise<void>; delete(file: unknown, force?: boolean): Promise<void>; }
                declare const vault: Vault;
                async function remove(file: unknown, mode: string) {
                    if (mode === "permanent") {
                        await vault.delete(file, true);
                    } else if (mode === "system") {
                        if (file) { await vault.trash(file, true); }
                    } else {
                        await vault.trash(file, false);
                    }
                    await (mode === "system" ? vault.trash(file, true) : vault.trash(file, false));
                }
            `,
            options: since,
        },
    ],
    invalid: [
        {
            // force only lets delete() remove a folder that is not empty: the
            // file is gone for good either way, and no destination is chosen.
            name: "vault.delete() with a force that is not a literal is forbidden",
            options: since,
            code: `
                declare class Vault { delete(file: unknown, force?: boolean): void; }
                declare const vault: Vault;
                declare const force: boolean;
                vault.delete(someFile, force);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" }, line: 5, suggestions: [] }],
        },
        {
            name: "branches that differ only in delete()'s force are not a deletion setting",
            options: since,
            code: `
                declare class Vault { delete(file: unknown, force?: boolean): Promise<void>; }
                declare const vault: Vault;
                async function remove(file: unknown, isFolder: boolean) {
                    if (isFolder) {
                        await vault.delete(file, true);
                    } else {
                        await vault.delete(file);
                    }
                    await (isFolder ? vault.delete(file, true) : vault.delete(file, false));
                }
            `,
            errors: [
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 6, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 8, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 10, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, line: 10, suggestions: [] },
            ],
        },
        {
            name: "vault.trash is forbidden",
            options: since,
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
            options: since,
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
            options: since,
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
            options: since,
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
            options: since,
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
            options: since,
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
            options: since,
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
            options: since,
            code: `
                declare class Vault { delete(file: unknown): Promise<void>; }
                declare const mv: Vault | null;
                mv?.delete(someFile);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" } }],
        },
        {
            name: "an optional vault property is found by type",
            options: since,
            code: `
                declare class Vault { trash(file: unknown, system: boolean): Promise<void>; }
                declare const app: { vault?: Vault };
                app.vault?.trash(someFile, true);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "trash" } }],
        },
        {
            name: "a vault read through an optional chain is found by type",
            options: since,
            code: `
                declare class Vault { delete(file: unknown): Promise<void>; }
                declare const plugin: { app: { vault: Vault } } | undefined;
                plugin?.app.vault.delete(someFile);
            `,
            errors: [{ messageId: "preferTrashFile", data: { methodName: "delete" } }],
        },
    ],
});

// The suggestion, with Obsidian's own typings.
const header = `import { App, Plugin, TFile, Vault } from "obsidian";
declare const app: App;
declare const file: TFile;
`;
const offered = (output: string) => [{ messageId: "useTrashFile" as const, output: header + output }];

ruleTester.run("prefer-file-manager-trash-file suggestions", preferFileManagerTrashRule, {
    valid: [],
    invalid: [
        {
            name: "app.vault.trash(file) becomes app.fileManager.trashFile(file)",
            code: header + "void app.vault.trash(file);",
            options: since,
            errors: [{ messageId: "preferTrashFile", suggestions: offered("void app.fileManager.trashFile(file);") }],
        },
        {
            name: "await is kept, and trash()'s system argument is dropped",
            code: header + "export class P extends Plugin { async remove(f: TFile) { await this.app.vault.trash(f, true); } }",
            options: since,
            errors: [{
                messageId: "preferTrashFile",
                suggestions: offered("export class P extends Plugin { async remove(f: TFile) { await this.app.fileManager.trashFile(f); } }"),
            }],
        },
        {
            name: "?. is kept",
            code: header + "declare const plugin: Plugin | undefined; void plugin?.app.vault.trash(file, false); void app.vault?.trash?.(file, true);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: offered("declare const plugin: Plugin | undefined; void plugin?.app.fileManager.trashFile(file); void app.vault?.trash?.(file, true);") },
                { messageId: "preferTrashFile", suggestions: offered("declare const plugin: Plugin | undefined; void plugin?.app.vault.trash(file, false); void app.fileManager?.trashFile?.(file);") },
            ],
        },
        {
            name: "a computed method keeps its quotes",
            code: header + "void app.vault[\"trash\"](file); void app.vault[`trash`](file, false);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: offered("void app.fileManager[\"trashFile\"](file); void app.vault[`trash`](file, false);") },
                { messageId: "preferTrashFile", suggestions: offered("void app.vault[\"trash\"](file); void app.fileManager[`trashFile`](file);") },
            ],
        },
        {
            name: "parentheses and comments outside the dropped argument are kept",
            code: header + "void (app.vault /* the vault */).trash((file), (true));",
            options: since,
            errors: [{ messageId: "preferTrashFile", suggestions: offered("void (app.fileManager /* the vault */).trashFile((file));") }],
        },
        {
            name: "a trailing comma and CRLF line endings are kept",
            code: header.replace(/\n/g, "\r\n") + "void app.vault.trash(\r\n    file,\r\n    true,\r\n);\r\n",
            options: since,
            errors: [{
                messageId: "preferTrashFile",
                suggestions: [{ messageId: "useTrashFile", output: header.replace(/\n/g, "\r\n") + "void app.fileManager.trashFile(\r\n    file,\r\n);\r\n" }],
            }],
        },
        {
            name: "a minAppVersion that is not a version: the suggestion says what it needs",
            code: header + "void app.vault.trash(file);",
            options: [{ minAppVersion: "latest" }],
            errors: [{
                messageId: "preferTrashFile",
                suggestions: [{ messageId: "useTrashFileSince", data: { since: "1.6.6" }, output: header + "void app.fileManager.trashFile(file);" }],
            }],
        },
        // Nothing is offered:
        {
            // inventtasks, templater, obsidian-custom-attachment-location:
            // deliberate permanent deletes of the plugin's own files.
            name: "for vault.delete(), a permanent delete that may be deliberate",
            code: header + "void app.vault.delete(file); void app.vault.delete(file, true); void app.vault[\"delete\"](file); export class P extends Plugin { async rollback(f: TFile) { await this.app.vault.delete(f); } }",
            options: since,
            errors: [
                { messageId: "preferTrashFile", data: { methodName: "delete" }, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, suggestions: [] },
                { messageId: "preferTrashFile", data: { methodName: "delete" }, suggestions: [] },
            ],
        },
        {
            name: "with no minAppVersion that is a version, for vault.delete() either",
            code: header + "void app.vault.delete(file);",
            options: [{ minAppVersion: "latest" }],
            errors: [{ messageId: "preferTrashFile", suggestions: [] }],
        },
        {
            name: "on a vault that is not <expr>.vault, which has no fileManager next to it",
            code: header + "declare const vault: Vault; void vault.trash(file, true); void app[\"vault\"].trash(file, true);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: [] },
                { messageId: "preferTrashFile", suggestions: [] },
            ],
        },
        {
            name: "where the receiver's type has no fileManager.trashFile",
            code: header + "declare const a: { vault: Vault }; declare const b: { vault: Vault; fileManager: { promptForDeletion(f: TFile): Promise<boolean> } }; void a.vault.trash(file, false); void b.vault.trash(file, false);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: [] },
                { messageId: "preferTrashFile", suggestions: [] },
            ],
        },
        {
            name: "where the dropped argument has a comment",
            code: header + "void app.vault.trash(file, /* system */ true);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: [] },
            ],
        },
        {
            name: "a single kind of delete in a branch is still reported",
            code: header + "declare const confirmed: boolean; if (confirmed) { void app.vault.trash(file, true); } else { void app.vault.read(file); }",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: offered("declare const confirmed: boolean; if (confirmed) { void app.fileManager.trashFile(file); } else { void app.vault.read(file); }") },
            ],
        },
        {
            name: "with a spread or extra arguments",
            // The extra argument does not type-check; the rule reports the call all the same.
            code: header + "declare const args: [TFile, boolean]; void app.vault.trash(...args); void app.vault.trash(file, true, 1);",
            options: since,
            errors: [
                { messageId: "preferTrashFile", suggestions: [] },
                { messageId: "preferTrashFile", suggestions: [] },
            ],
        },
    ],
});

// A JavaScript file in a TypeScript project, typed through JSDoc.
const jsRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/js-project` },
    },
});

jsRuleTester.run("prefer-file-manager-trash-file in a JavaScript file", preferFileManagerTrashRule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion is offered",
            filename: "main.js",
            code: "/** @param {import(\"obsidian\").App} app @param {import(\"obsidian\").TFile} file */\nexport async function remove(app, file) {\n    await app.vault.trash(file, false);\n}\n",
            options: since,
            errors: [{
                messageId: "preferTrashFile",
                suggestions: [{
                    messageId: "useTrashFile",
                    output: "/** @param {import(\"obsidian\").App} app @param {import(\"obsidian\").TFile} file */\nexport async function remove(app, file) {\n    await app.fileManager.trashFile(file);\n}\n",
                }],
            }],
        },
    ],
});
