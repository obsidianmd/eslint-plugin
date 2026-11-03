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
        {
            name: "typeof document in declare global is allowed",
            code: "declare global { interface Window { doc: typeof document } }",
        },
        {
            name: "abstract class property named document is allowed",
            code: "abstract class Foo { abstract document: string; }",
        },
        {
            name: "abstract class method named document is allowed",
            code: "abstract class Foo { abstract document(): void; }",
        },
        {
            name: "class accessor named document is allowed",
            code: "class Foo { accessor document = ''; }",
        },
        {
            name: "renamed destructured document is allowed",
            code: "const { document: doc } = someObj;",
        },
        {
            name: "window.document and globalThis.document are not reported",
            code: "window.document.body; globalThis.document.body;",
        },
        // prefer-create-el reports these calls in a TypeScript file with type
        // information, and its replacement drops `document`.
        {
            name: "document.createElement() is left to prefer-create-el",
            code: "const el = document.createElement('p'); document.createElement('div'); document.createElement(tag);",
        },
        {
            name: "document.createElementNS() for SVG is left to prefer-create-el",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
        },
        {
            name: "document.createDocumentFragment() is left to prefer-create-el",
            code: "const fragment = document.createDocumentFragment();",
        },
        {
            name: "document.createEl('div') and ('span') are left to prefer-create-el",
            code: "document.createEl('div', { cls: 'x' }); document.createEl('span');",
        },
        {
            name: "optional calls are left to prefer-create-el",
            code: "document?.createElement('p'); document.createElement?.('p');",
        },
    ],
    invalid: [
        {
            name: "bare document reference is forbidden",
            code: "document.getElementById('my-plugin');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        // Calls prefer-create-el does not report, or whose replacement keeps `document`.
        {
            name: "document.createElement() with options is still flagged",
            code: "document.createElement('div', { is: 'my-div' });",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document.createElementNS() for another namespace is still flagged",
            code: "document.createElementNS('http://www.w3.org/1999/xhtml', 'div');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document.createEl() with a tag other than div or span is still flagged",
            code: "document.createEl('p');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document.createTextNode() is still flagged",
            code: "document.createTextNode('text');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "an asserted document's createElement() is still flagged, as prefer-create-el keeps it in doc.win.createEl()",
            code: "document!.createElement('p'); (document as Document).createElement('p');",
            errors: [
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
            ],
        },
        {
            name: "document.createElement that is not called is still flagged",
            code: "const create = document.createElement.bind(document);",
            errors: [
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
            ],
        },
        {
            name: "document as an argument to createElement is still flagged",
            code: "el.createElement(document);",
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
        {
            name: "document inside a non-ambient namespace is still flagged",
            code: "namespace Foo { export const el = document.body; }",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document as a computed member key is still flagged",
            code: "obj[document];",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document as a computed object key is still flagged",
            code: "const x = { [document]: 1 };",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "document as a computed class key is still flagged",
            code: "class Foo { [document] = 1; }",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
        {
            name: "shorthand object property document is still flagged",
            code: "const x = { document };",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
    ],
});

// prefer-create-el needs type information, and the recommended config runs it
// on TypeScript files only. Elsewhere prefer-active-doc is the only rule that
// reports document.createElement().
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("prefer-active-doc without type information", preferActiveDocRule, {
    valid: [],
    invalid: [
        {
            name: "document.createElement() is flagged",
            code: "document.createElement('div'); document.createDocumentFragment();",
            errors: [
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
                { messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } },
            ],
        },
    ],
});

// A JavaScript file in a TypeScript project, such as a hand-written main.js
// listed in allowDefaultProject: it has type information, but the recommended
// config does not run prefer-create-el on it.
const typedJsRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/js-project` },
    },
});

typedJsRuleTester.run("prefer-active-doc in a JavaScript file with type information", preferActiveDocRule, {
    valid: [],
    invalid: [
        {
            name: "document.createElement() is flagged",
            filename: "main.js",
            code: "document.createElement('div');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
    ],
});
