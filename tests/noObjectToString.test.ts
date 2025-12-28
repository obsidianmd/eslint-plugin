import { RuleTester } from "@typescript-eslint/rule-tester";
import noObjectToString from "../lib/rules/noObjectToString.js";

const ruleTester = new RuleTester();

ruleTester.run("no-object-to-string", noObjectToString, {
    valid: [
        // Primitives are fine
        { code: 'const x: string = "hello"; x.toString();' },
        { code: "const x: number = 42; x.toString();" },
        { code: "const x: boolean = true; x.toString();" },
        // Type-guarded values are fine
        {
            code: `
const fm: Record<string, unknown> = {};
const year = fm["Year"];
if (typeof year === "string") {
    year.toString();
}
            `,
        },
        // setText with string is fine
        { code: 'const text: string = "hello"; el.setText(text);' },
        // Template literals with primitives are fine
        { code: "const x: number = 42; const s = `Value: ${x}`;" },
        { code: 'const x: string = "test"; const s = `Value: ${x}`;' },
        // Arrays have reasonable toString
        { code: "const arr: string[] = ['a', 'b']; arr.toString();" },
    ],
    invalid: [
        // unknown type
        {
            code: "const x: unknown = {}; x.toString();",
            errors: [{ messageId: "objectToString" }],
        },
        // any type
        {
            code: "const x: any = {}; x.toString();",
            errors: [{ messageId: "objectToString" }],
        },
        // Object type
        {
            code: "const x: object = {}; x.toString();",
            errors: [{ messageId: "objectToString" }],
        },
        // Record type (object)
        {
            code: "const x: Record<string, unknown> = {}; x.toString();",
            errors: [{ messageId: "objectToString" }],
        },
        // Interface type
        {
            code: `
interface MyData { name: string; }
const x: MyData = { name: "test" };
x.toString();
            `,
            errors: [{ messageId: "objectToString" }],
        },
        // setText with unknown
        {
            code: "const x: unknown = {}; el.setText(x);",
            errors: [{ messageId: "objectInSetText" }],
        },
        // Template literal with object
        {
            code: "const x: object = {}; const s = `Value: ${x}`;",
            errors: [{ messageId: "objectInTemplate" }],
        },
        // Template literal with unknown
        {
            code: "const x: unknown = {}; const s = `Value: ${x}`;",
            errors: [{ messageId: "objectInTemplate" }],
        },
        // Union type that includes object
        {
            code: "const x: string | object = {}; x.toString();",
            errors: [{ messageId: "objectToString" }],
        },
        // Frontmatter pattern from requirements doc
        {
            code: `
const fm: Record<string, unknown> = {};
const year = fm["Year"];
year.toString();
            `,
            errors: [{ messageId: "objectToString" }],
        },
    ],
});
