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
    ],
});
