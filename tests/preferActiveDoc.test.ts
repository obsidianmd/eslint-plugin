import { RuleTester } from "@typescript-eslint/rule-tester";
import preferActiveDocRule from "../lib/rules/preferActiveDoc.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-active-doc", preferActiveDocRule, {
    valid: [
        {
            name: "activeDocument is allowed",
            code: "activeDocument.createElement('div');",
        },
        {
            name: "activeWindow is allowed",
            code: "activeWindow.requestAnimationFrame(() => {});",
        },
        {
            name: "property named document on an object is allowed",
            code: "const obj = { document: 1 }; obj.document;",
        },
        {
            name: "property named window on an object is allowed",
            code: "const obj = { window: 1 }; obj.window;",
        },
        {
            name: "local variable named document is allowed",
            code: "const document = activeDocument; document.createElement('div');",
        },
        {
            name: "local variable named window is allowed",
            code: "const window = activeWindow; window.setTimeout(() => {}, 0);",
        },
        {
            name: "typeof window check is allowed",
            code: "if (typeof window !== 'undefined') {}",
        },
        {
            name: "typeof document check is allowed",
            code: "if (typeof document !== 'undefined') {}",
        },
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
            name: "constructor is not replaced",
            code: "class A { constructor() {} }",
        },
        {
            name: "hasOwnProperty is not replaced",
            code: "class A { hasOwnProperty() {} }",
        },
        {
            name: "isPrototypeOf is not replaced",
            code: "class A { isPrototypeOf() {} }",
        },
        {
            name: "propertyIsEnumerable is not replaced",
            code: "class A { propertyIsEnumerable() {} }",
        },
        {
            name: "toLocaleString is not replaced",
            code: "class A { toLocaleString() {} }",
        },
        {
            name: "toString is not replaced",
            code: "class A { toString() {} }",
        },
        {
            name: "valueOf is not replaced",
            code: "class A { valueOf() {} }",
        },
        {
            name: "__proto__ is not replaced",
            code: "class A { __proto__() {} }",
        },
    ],
    invalid: [
        {
            name: "bare document reference is forbidden",
            code: "document.createElement('div');",
            output: "activeDocument.createElement('div');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "bare window reference is forbidden",
            code: "window.requestAnimationFrame(() => {});",
            output: "activeWindow.requestAnimationFrame(() => {});",
            errors: [{ messageId: "preferActive", data: { original: "window", replacement: "activeWindow" } }],
        },
        {
            name: "document.body is forbidden",
            code: "const body = document.body;",
            output: "const body = activeDocument.body;",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "window.innerWidth is forbidden",
            code: "const width = window.innerWidth;",
            output: "const width = activeWindow.innerWidth;",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "document.querySelector is forbidden",
            code: "document.querySelector('.my-class');",
            output: "activeDocument.querySelector('.my-class');",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "document.addEventListener is forbidden",
            code: "document.addEventListener('click', handler);",
            output: "activeDocument.addEventListener('click', handler);",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "window.setTimeout is forbidden",
            code: "window.setTimeout(() => {}, 100);",
            output: "activeWindow.setTimeout(() => {}, 100);",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "globalThis reference is forbidden",
            code: "globalThis.setTimeout(() => {}, 100);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "global reference is forbidden",
            code: "global.process;",
            errors: [{ messageId: "avoidGlobal", data: { name: "global" } }],
        },
    ],
});
