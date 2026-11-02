import { RuleTester } from "@typescript-eslint/rule-tester";
import noGlobalThisRule from "../lib/rules/noGlobalThis.js";

const ruleTester = new RuleTester();

ruleTester.run("no-global-this", noGlobalThisRule, {
    valid: [
        {
            name: "typeof globalThis check is allowed",
            code: "if (typeof globalThis !== 'undefined') {}",
        },
        {
            name: "property named global on an object is allowed",
            code: "const obj = { global: 1 }; obj.global;",
        },
        {
            name: "declare global is allowed",
            code: "declare global { var someVar: string; }",
        },
        {
            name: "local variable named global is allowed",
            code: "const global = 1; global;",
        },
        {
            name: "local variable named globalThis is allowed",
            code: "const globalThis = 1; globalThis;",
        },
        {
            name: "variable declaration named globalThis is allowed",
            code: "const globalThis = {};",
        },
        {
            name: "a type-literal property key named global is allowed",
            code: "type Options = { global: boolean };",
        },
        {
            name: "an interface property key named global is allowed",
            code: "interface Options { global: boolean; globalThis?: string }",
        },
        {
            name: "typeof globalThis in a type annotation is allowed",
            code: "let scope: typeof globalThis | undefined;",
        },
        {
            name: "a qualified type through globalThis is allowed",
            code: "type Timer = ReturnType<typeof globalThis.setTimeout>; let t: Timer | undefined;",
        },
        {
            name: "a class member named global is allowed",
            code: "class Settings { global = true; globalThis() { return 1; } }",
        },
        {
            name: "an enum member named global is allowed",
            code: "enum Scope { global, local }",
        },
        {
            name: "an ambient declaration using globalThis is allowed",
            code: "declare const scope: typeof globalThis;",
        },
        {
            name: "an imported name global is allowed",
            code: "import { global as g } from './scope'; g;",
        },
        {
            name: "an exported name global is allowed",
            code: "const scope = 1; export { scope as global };",
        },
    ],
    invalid: [
        {
            name: "globalThis reference is forbidden",
            code: "globalThis.setTimeout(() => {}, 100);",
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "global reference is forbidden",
            code: "global.process;",
            output: "window.process;",
            errors: [{ messageId: "avoidGlobal", data: { name: "global" } }],
        },
        {
            name: "globalThis cast to another type is still forbidden",
            code: "(globalThis as unknown as { x: number }).x;",
            output: "(window as unknown as { x: number }).x;",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a computed key reading globalThis is still forbidden",
            code: "const o = { [globalThis.Symbol.iterator]: 1 };",
            output: "const o = { [window.Symbol.iterator]: 1 };",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "globalThis as a computed key is still forbidden",
            code: "const o = { [globalThis]: 1 };",
            output: "const o = { [window]: 1 };",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "globalThis as a computed member property is still forbidden",
            code: "declare const table: Record<PropertyKey, number>; table[globalThis as never]; declare const any: any; any[globalThis];",
            output: "declare const table: Record<PropertyKey, number>; table[window as never]; declare const any: any; any[window];",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a shorthand property keeps its key when fixed",
            code: "const o = { globalThis };",
            output: "const o = { globalThis: window };",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
    ],
});
