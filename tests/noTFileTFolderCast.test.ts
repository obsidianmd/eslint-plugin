import { RuleTester } from "@typescript-eslint/rule-tester";
import noTFileTFolderCastRule from "../lib/rules/noTFileTFolderCast.js";

const ruleTester = new RuleTester();

ruleTester.run("no-tfile-tfolder-cast", noTFileTFolderCastRule, {
    valid: [
        {
            name: "instanceof check is allowed",
            code: `
                declare const file: TAbstractFile;
                if (file instanceof TFile) {
                    console.log(file.path);
                }
            `,
        },
        {
            name: "casting to other types is allowed",
            code: "const x = value as string;",
        },
        {
            name: "type annotation is allowed",
            code: "const myFile: TFile | null = null;",
        },
        {
            name: "an assertion to a qualified name is not reported",
            code: "const a = v as obsidian.TFile; const b = v as obsidian.TFile | null; const c = v as obsidian.TFile[];",
        },
        {
            name: "satisfies is not reported",
            code: "const a = v satisfies TFile; const b = v satisfies TFile | null;",
        },
        {
            name: "a file or a folder is what every TAbstractFile is, so it is not reported",
            code: "const a = v as TFile | TFolder; const b = v as TFolder | TFile | null; const c = v as (TFile | TFolder)[];",
        },
        {
            name: "other generic types of TFile are not reported",
            code: "const a = v as Promise<TFile>; const b = v as Map<string, TFolder>; const c = v as Record<string, TFile>;",
        },
        {
            name: "an intersection or a tuple is not reported",
            code: "const a = v as TFile & { extra: string }; const b = v as [TFile, TFolder];",
        },
        {
            name: "a type operator other than readonly is not reported",
            code: "const key = k as keyof TFile;",
        },
        {
            name: "null typed as a nullable file is not reported",
            code: "let file = null as TFile | null; let folder = undefined as TFolder | undefined;",
        },
        {
            name: "an empty array typed as files is not reported",
            code: "const files = [] as TFile[]; const folders = <Array<TFolder>>[];",
        },
        {
            name: "a value that has the asserted type already is not narrowed, so it is not reported",
            code: `
                import { TFile, TFolder, Vault } from "obsidian";
                declare const vault: Vault;
                declare const file: TFile;
                declare const files: TFile[];
                declare const startingFolder: TFolder;
                const a = vault.getFileByPath("a.md") as TFile | null;
                const b = files as readonly TFile[];
                const c = [startingFolder] as TFolder[];
                const d = file as TFile;
            `,
        },
    ],
    invalid: [
        {
            name: "as TFile cast is forbidden",
            code: "const myFile = someValue as TFile;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "as TFolder cast is forbidden",
            code: "const myFolder = someValue as TFolder;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
        },
        {
            name: "angle bracket TFile cast is forbidden",
            code: "const myFile = <TFile>someValue;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "angle bracket TFolder cast is forbidden",
            code: "const myFolder = <TFolder>someValue;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
        },
        {
            name: "as TFile cast in expression is forbidden",
            code: "const path = (someValue as TFile).path;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a union with null is reported at TFile",
            code: "const file = v as TFile | null;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" }, column: 19, endColumn: 24 }],
        },
        {
            name: "a union with undefined is reported",
            code: "const folder = v as undefined | TFolder;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
        },
        {
            name: "an angle bracket union is reported",
            code: "const file = <TFile | null>v;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a union with another type is reported",
            code: "const target = v as TFile | string;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "an array of TFile is reported",
            code: "const files = children as TFile[];",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "an Array<TFolder> is reported",
            code: "const folders = children as Array<TFolder>;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
        },
        {
            name: "a readonly array is reported",
            code: "const a = children as readonly TFile[]; const b = children as ReadonlyArray<TFolder>;",
            errors: [
                { messageId: "avoidCast", data: { typeName: "TFile" } },
                { messageId: "avoidCast", data: { typeName: "TFolder" } },
            ],
        },
        {
            name: "an array or undefined is reported",
            code: "const children = dir.children as TFile[] | undefined;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "an array of nullable files is reported",
            code: "const files = paths.map(find) as (TFile | null)[];",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "null asserted to be a file is still reported",
            code: "const file = null as TFile;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "an abstract file asserted to be a file or null is reported",
            code: `
                import { TFile, Vault } from "obsidian";
                declare const vault: Vault;
                const file = vault.getAbstractFileByPath("a.md") as TFile | null;
            `,
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a folder's children asserted to be files are reported",
            code: `
                import { TFile, TFolder } from "obsidian";
                declare const folder: TFolder;
                const files = folder.children as TFile[];
            `,
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a value of type any asserted to be a nullable file is reported",
            code: `
                import { TFile } from "obsidian";
                declare const view: any;
                const file = view.file as TFile | null;
            `,
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            // Without the obsidian import, TFile is an error type that a string
            // is assignable to, which proves nothing about the value.
            name: "a typed value asserted to be a nullable file without the obsidian types is reported",
            code: `
                declare const name: string;
                const file = name as TFile | null;
            `,
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a nullable file asserted to be a file is still reported",
            code: `
                import { TFile, Vault } from "obsidian";
                declare const vault: Vault;
                const file = vault.getFileByPath("a.md") as TFile;
            `,
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
    ],
});

// Without type information, only null, undefined and [] are known to have a
// nullable or array type already.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("no-tfile-tfolder-cast without type information", noTFileTFolderCastRule, {
    valid: [
        {
            name: "null, undefined and [] typed as files are not reported",
            code: "let a = null as TFile | null; let b = undefined as TFolder | undefined; const c = [] as TFile[];",
        },
    ],
    invalid: [
        {
            name: "a union is reported without type information",
            code: "const file = vault.getFileByPath(path) as TFile | null;",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
        {
            name: "a literal other than null, or an identifier other than undefined, typed as a nullable file is reported",
            code: "const a = 0 as TFile | null; const b = file as TFile | undefined;",
            errors: [
                { messageId: "avoidCast", data: { typeName: "TFile" } },
                { messageId: "avoidCast", data: { typeName: "TFile" } },
            ],
        },
        {
            name: "an array is reported without type information",
            code: "const files = [file] as TFile[];",
            errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
        },
    ],
});
