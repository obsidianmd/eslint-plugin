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
            name: "bare window reference is allowed",
            code: "window.requestAnimationFrame(() => {});",
        },
        {
            name: "property named document on an object is allowed",
            code: "const obj = { document: 1 }; obj.document;",
        },
        {
            name: "local variable named document is allowed",
            code: "const document = activeDocument; document.createElement('div');",
        },
        {
            name: "typeof document check is allowed",
            code: "if (typeof document !== 'undefined') {}",
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
        {
            name: "window.setTimeout is allowed",
            code: "window.setTimeout(() => {}, 100);",
        },
        {
            name: "window.clearTimeout is allowed",
            code: "window.clearTimeout(id);",
        },
        {
            name: "window.setInterval is allowed",
            code: "window.setInterval(() => {}, 1000);",
        },
        {
            name: "window.clearInterval is allowed",
            code: "window.clearInterval(id);",
        },
        {
            name: "window.requestAnimationFrame is allowed",
            code: "window.requestAnimationFrame(() => {});",
        },
    ],
    invalid: [
        {
            name: "bare document reference is forbidden",
            code: "document.createElement('div');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document.body is forbidden",
            code: "const body = document.body;",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "document.querySelector is forbidden",
            code: "document.querySelector('.my-class');",
            errors: [{ messageId: "preferActive" }],
        },
        {
            name: "document.addEventListener is forbidden",
            code: "document.addEventListener('click', handler);",
            errors: [{ messageId: "preferActive" }],
        },
    ],
});
