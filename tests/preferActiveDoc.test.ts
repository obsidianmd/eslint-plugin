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
        {
            name: "interface property named document is allowed",
            code: "interface Foo { document: string; }",
        },
        {
            name: "typeof property access in type position is allowed",
            code: "let html: ReturnType<typeof mathjax.document> | null = null;",
        },
        {
            name: "type alias property named document is allowed",
            code: "type Foo = { document: string; };",
        },
        {
            name: "interface method named document is allowed",
            code: "interface Foo { document(): void; }",
        },
        {
            name: "class property named document is allowed",
            code: "class Foo { document: string = ''; }",
        },
        {
            name: "class method named document is allowed",
            code: "class Foo { document() { return ''; } }",
        },
        {
            name: "enum member named document is allowed",
            code: "enum Foo { document = 'doc' }",
        },
        {
            name: "document in type annotation is allowed",
            code: "const x: { document: string } = { document: '' };",
        },
        {
            name: "document in index signature is allowed",
            code: "interface Foo { [document: string]: number; }",
        },
        {
            name: "function parameter named document is allowed",
            code: "function foo(document: Document) { document.title; }",
        },
        {
            name: "destructured document is allowed",
            code: "const { document } = someObj;",
        },
        {
            name: "for-of binding named document is allowed",
            code: "for (const document of docs) { document.title; }",
        },
        {
            name: "label named document is allowed",
            code: "document: while(true) { break document; }",
        },
        {
            name: "typeof in type position is allowed",
            code: "type T = typeof document;",
        },
        {
            name: "document in declare module is allowed",
            code: "declare module 'foo' { const document: string; }",
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
        {
            name: "document in as-expression is still flagged",
            code: "const el = (document as any).body;",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document in satisfies-expression is still flagged",
            code: "const el = (document satisfies Document).body;",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document in non-null assertion is still flagged",
            code: "const el = document!.body;",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document in enum initializer is still flagged",
            code: "enum Foo { bar = document.title }",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
    ],
});
