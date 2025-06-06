import { RuleTester } from "@typescript-eslint/rule-tester";
import noTFileTFolderCastRule from "../lib/rules/noTFileTFolderCast.js";

const ruleTester = new RuleTester();

ruleTester.run("no-tfile-tfolder-cast", noTFileTFolderCastRule, {
	valid: [
		// Correct usage with instanceof
		{
			code: `
                declare const file: TAbstractFile;
                if (file instanceof TFile) {
                    console.log(file.path);
                }
            `,
		},
		// Casting to other types is fine
		{
			code: "const x = value as string;",
		},
		// Using as a type annotation is fine
		{
			code: "const myFile: TFile | null = null;",
		},
	],
	invalid: [
		// Invalid `as` casts
		{
			code: "const myFile = someValue as TFile;",
			errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
		},
		{
			code: "const myFolder = someValue as TFolder;",
			errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
		},
		// Invalid `<>` casts
		{
			code: "const myFile = <TFile>someValue;",
			errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
		},
		{
			code: "const myFolder = <TFolder>someValue;",
			errors: [{ messageId: "avoidCast", data: { typeName: "TFolder" } }],
		},
		// Invalid cast inside an expression
		{
			code: "const path = (someValue as TFile).path;",
			errors: [{ messageId: "avoidCast", data: { typeName: "TFile" } }],
		},
	],
});
