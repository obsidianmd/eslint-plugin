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
    ],
});
