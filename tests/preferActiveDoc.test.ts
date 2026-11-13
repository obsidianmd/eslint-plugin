import assert from "node:assert";
import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { type ESLint, Linter } from "eslint";
import { describe, it } from "mocha";
import globals from "globals";
import tseslint from "typescript-eslint";
import preferActiveDocRule from "../lib/rules/preferActiveDoc.js";
import preferCreateElRule from "../lib/rules/preferCreateEl.js";

// A project whose program has the obsidian typings, as a plugin's does, so
// that activeDocument is declared and the suggestion is offered.
const ruleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/obsidian-project` },
    },
});

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
        // Object.prototype's members are not replacements. A class member key
        // is skipped as a key, so each test also has a bare reference.
        {
            name: "constructor is not replaced",
            code: "class A { constructor() {} } constructor;",
        },
        {
            name: "hasOwnProperty is not replaced",
            code: "class A { hasOwnProperty() {} } hasOwnProperty;",
        },
        {
            name: "isPrototypeOf is not replaced",
            code: "class A { isPrototypeOf() {} } isPrototypeOf;",
        },
        {
            name: "propertyIsEnumerable is not replaced",
            code: "class A { propertyIsEnumerable() {} } propertyIsEnumerable;",
        },
        {
            name: "toLocaleString is not replaced",
            code: "class A { toLocaleString() {} } toLocaleString;",
        },
        {
            name: "toString is not replaced",
            code: "class A { toString() {} } toString;",
        },
        {
            name: "valueOf is not replaced",
            code: "class A { valueOf() {} } valueOf;",
        },
        {
            name: "__proto__ is not replaced",
            code: "class A { __proto__() {} } __proto__;",
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
            name: "continue to a label named document is allowed",
            code: "document: for (;;) { continue document; }",
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
            name: "document in an ambient module is allowed",
            code: "declare module 'shim' { export default document; }",
        },
        {
            name: "typeof document in a type assertion is allowed",
            code: "const doc = getDoc() as typeof document;",
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
            name: "abstract class accessor named document is allowed",
            code: "abstract class Foo { abstract accessor document: string; }",
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
            // createSvg() is 1.1.0; this repository's manifest says 0.15.0.
            options: [{ minAppVersion: "1.1.0" }],
        },
        {
            // Below 0.15.0 neither activeDocument nor createSvg() can be used.
            name: "document.createElementNS() for SVG below 0.15.0 is left alone",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path'); document.createElement('div');",
            options: [{ minAppVersion: "0.9.12" }],
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
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.getElementById('my-plugin');" }],
                },
            ],
        },
        // Calls prefer-create-el does not report, or whose replacement keeps `document`.
        {
            // prefer-create-el reports nothing inside an implementation of its
            // helpers, where its replacement could call the function it is in.
            name: "document.createElement() inside a helper polyfill is flagged here",
            code: "(window as any).createDiv = () => document.createElement('div');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "(window as any).createDiv = () => activeDocument.createElement('div');" }],
                },
            ],
        },
        {
            name: "document.createElement() inside a method named after a helper is flagged here",
            code: "class Shim { createSpan() { return document.createElement('span'); } }",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "class Shim { createSpan() { return activeDocument.createElement('span'); } }" }],
                },
            ],
        },
        {
            name: "document.createElement() with options is still flagged",
            code: "document.createElement('div', { is: 'my-div' });",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createElement('div', { is: 'my-div' });" }],
                },
            ],
        },
        {
            // createSvg() is 1.1.0, so prefer-create-el leaves the call alone
            // below that, and this rule reports it.
            name: "document.createElementNS() for SVG below the version that has createSvg() is flagged",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createElementNS('http://www.w3.org/2000/svg', 'path');" }],
                },
            ],
        },
        {
            name: "document.createElementNS() for another namespace is still flagged",
            code: "document.createElementNS('http://www.w3.org/1999/xhtml', 'div');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createElementNS('http://www.w3.org/1999/xhtml', 'div');" }],
                },
            ],
        },
        {
            name: "document.createEl() with a tag other than div or span is still flagged",
            code: "document.createEl('p');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createEl('p');" }],
                },
            ],
        },
        {
            name: "document.createTextNode() is still flagged",
            code: "document.createTextNode('text');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createTextNode('text');" }],
                },
            ],
        },
        {
            name: "an asserted document's createElement() is still flagged, as prefer-create-el keeps it in doc.win.createEl()",
            code: "document!.createElement('p'); (document as Document).createElement('p');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument!.createElement('p'); (document as Document).createElement('p');" }],
                },
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "document!.createElement('p'); (activeDocument as Document).createElement('p');" }],
                },
            ],
        },
        {
            name: "document.createElement that is not called is still flagged",
            code: "const create = document.createElement.bind(document);",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const create = activeDocument.createElement.bind(document);" }],
                },
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    // Handed on as a value: no suggestion.
                    suggestions: [],
                },
            ],
        },
        {
            name: "document as an argument to createElement is still flagged, without a suggestion",
            code: "el.createElement(document);",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [],
                },
            ],
        },
        {
            name: "a document member as an argument to createElement is still flagged",
            code: "el.createElement(document.title);",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "el.createElement(activeDocument.title);" }],
                },
            ],
        },
        {
            name: "document.body is forbidden",
            code: "const body = document.body;",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const body = activeDocument.body;" }],
                },
            ],
        },
        {
            name: "document.querySelector is forbidden",
            code: "document.querySelector('.my-class');",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.querySelector('.my-class');" }],
                },
            ],
        },
        {
            name: "document.addEventListener is reported, without a suggestion",
            code: "document.addEventListener('click', handler);",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [],
                },
            ],
        },
        {
            name: "document in as-expression is still flagged",
            code: "const el = (document as any).body;",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const el = (activeDocument as any).body;" }],
                },
            ],
        },
        {
            name: "document in satisfies-expression is still flagged",
            code: "const el = (document satisfies Document).body;",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const el = (activeDocument satisfies Document).body;" }],
                },
            ],
        },
        {
            name: "document in non-null assertion is still flagged",
            code: "const el = document!.body;",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const el = activeDocument!.body;" }],
                },
            ],
        },
        {
            name: "document in enum initializer is still flagged",
            code: "enum Foo { bar = document.title }",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "enum Foo { bar = activeDocument.title }" }],
                },
            ],
        },
        {
            name: "document inside a non-ambient namespace is still flagged",
            code: "namespace Foo { export const el = document.body; }",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "namespace Foo { export const el = activeDocument.body; }" }],
                },
            ],
        },
        {
            name: "document as a computed member key is still flagged",
            code: "obj[document];",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "obj[activeDocument];" }],
                },
            ],
        },
        {
            name: "document as a computed object key is still flagged",
            code: "const x = { [document]: 1 };",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "const x = { [activeDocument]: 1 };" }],
                },
            ],
        },
        {
            name: "document as a computed class key is still flagged",
            code: "class Foo { [document] = 1; }",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "class Foo { [activeDocument] = 1; }" }],
                },
            ],
        },
        {
            name: "shorthand object property document is still flagged",
            code: "const x = { document };",
            errors: [
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [],
                },
            ],
        },
    ],
});

// The suggestion, with type information: the project's own obsidian typings
// declare activeDocument.
const offered = (output: string) => [{ messageId: "useActiveDocument" as const, output }];

ruleTester.run("prefer-active-doc suggestions", preferActiveDocRule, {
    valid: [],
    invalid: [
        {
            name: "?. is kept",
            code: "export function f() { return document?.body; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function f() { return activeDocument?.body; }") }],
        },
        {
            name: "parentheses and comments are kept",
            code: "export function f() { return (/* main */ document).body; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function f() { return (/* main */ activeDocument).body; }") }],
        },
        {
            name: "CRLF line endings are kept",
            code: "export function f() {\r\n    return document.body;\r\n}\r\n",
            errors: [{ messageId: "preferActive", suggestions: offered("export function f() {\r\n    return activeDocument.body;\r\n}\r\n") }],
        },
        {
            name: "a shorthand property is handed on, without a suggestion",
            code: "export function f() { return { document }; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a variable of a function is set each time it runs",
            code: "export function f() { const doc = document; return doc; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function f() { const doc = activeDocument; return doc; }") }],
        },
        {
            name: "a field of an instance, set or assigned, keeps the document without a suggestion",
            code: "export class View { doc = document; constructor() { this.doc = document; } }",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "a typeof check in another function does not count",
            code: "export function a() { if (typeof document === 'undefined') return; } export function b() { return document.body; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function a() { if (typeof document === 'undefined') return; } export function b() { return activeDocument.body; }") }],
        },
        {
            name: "an element compared with document.body is not the document",
            code: "export function f(el: Element) { return el === document.body; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function f(el: Element) { return el === activeDocument.body; }") }],
        },
        {
            name: "the minAppVersion option at 0.15.0 or later",
            code: "document.body;",
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "preferActive", suggestions: offered("activeDocument.body;") }],
        },
        {
            name: "a minAppVersion of 0.15, read as 0.15.0",
            code: "document.body;",
            options: [{ minAppVersion: "0.15" }],
            errors: [{ messageId: "preferActive", suggestions: offered("activeDocument.body;") }],
        },
        {
            name: "a minAppVersion that is not a version: the suggestion says what it needs",
            code: "document.body;",
            options: [{ minAppVersion: "latest" }],
            errors: [{
                messageId: "preferActive",
                suggestions: [{ messageId: "useActiveDocumentSince", data: { since: "0.15.0" }, output: "activeDocument.body;" }],
            }],
        },
        // Nothing is offered where activeDocument is not the global, or not what the code means.
        {
            name: "a parameter named activeDocument",
            code: "export function f(activeDocument: Document) { return document.body; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a variable named activeDocument",
            code: "const activeDocument = 1; export function f() { return document.body; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a minAppVersion below 0.15.0, which has no activeDocument",
            code: "document.body;",
            options: [{ minAppVersion: "0.14.9" }],
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "after a typeof document check",
            code: "export function f() { if (typeof document === 'undefined') return null; return document.body; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "in a branch a typeof document check decides",
            code: "export const f = () => typeof document !== 'undefined' ? document.body : null;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "where a variable holding a window check decides",
            code: "const hasDom = typeof window !== 'undefined'; export function f() { if (hasDom) { return document.body; } return null; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "where an environment check decides",
            code: "declare const isBrowser: boolean; export function f() { if (isBrowser) { return document.body; } return null; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document compared with ===",
            code: "export function f(e: Event) { return e.target === document; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document compared with !=, through a cast",
            code: "export function f(el: Element) { return el.ownerDocument != (document as Document); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document as a switch case",
            code: "export function f(x: unknown) { switch (x) { case document: return 1; } return 0; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document kept in a variable of the module",
            code: "export const doc = document;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document kept in an object in a variable of the module",
            code: "const ctx = { doc: document, items: [document] }; ctx;",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "document assigned to a variable of the module",
            code: "let doc: Document | undefined; export function init() { doc = document; } doc;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document set on the global object",
            code: "export function init() { (window as any).pluginDoc = document; globalThis.doc = el?.ownerDocument ?? document; }",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "document exported from a CommonJS module",
            code: "module.exports.doc = document; exports.other = document;",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "where a try that reads the document has failed",
            code: "export function f() { let ok = true; try { document.body; } catch { ok = false; } return ok && document.title; }",
            errors: [
                { messageId: "preferActive", suggestions: offered("export function f() { let ok = true; try { activeDocument.body; } catch { ok = false; } return ok && document.title; }") },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "in a try whose catch drops the error",
            code: "export function f() { try { document.execCommand('copy'); } catch { /* not supported */ } }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document as the default export",
            code: "export default document;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document in a static field",
            code: "export class A { static doc = document; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "an assignment to document",
            code: "export function f(d: Document) { document = d; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
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
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.createElement('div'); document.createDocumentFragment();" }],
                },
                {
                    messageId: "preferActive",
                    data: { original: "document", replacement: "activeDocument" },
                    suggestions: [{ messageId: "useActiveDocument", output: "document.createElement('div'); activeDocument.createDocumentFragment();" }],
                },
            ],
        },
        {
            name: "a JavaScript file gets the suggestion",
            filename: "main.js",
            code: "function show() {\n    const el = document.querySelector(\".x\");\n}\n",
            errors: [{
                messageId: "preferActive",
                suggestions: [{ messageId: "useActiveDocument", output: "function show() {\n    const el = activeDocument.querySelector(\".x\");\n}\n" }],
            }],
        },
        // The recommended config switches the rule off for worker files, which
        // have no activeDocument; enabled there by hand, it offers nothing.
        {
            name: "nothing is offered in a file under workers/",
            filename: "src/workers/shims.ts",
            code: "document.body;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "nothing is offered in a .worker file",
            filename: "src/embedding.worker.js",
            code: "document.body;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a file that only looks like worker code gets the suggestion",
            filename: "src/workerManager.ts",
            code: "document.body;",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.body;" }] }],
        },
    ],
});

// A config that turns the global off, as the recommended config does for worker files.
const activeDocumentOffRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false }, globals: { activeDocument: "off" } },
});

activeDocumentOffRuleTester.run("prefer-active-doc where the config turns activeDocument off", preferActiveDocRule, {
    valid: [],
    invalid: [
        {
            name: "nothing is offered",
            code: "document.body;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
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
            // The fixture project has no obsidian typings, so no activeDocument.
            name: "document.createElement() is flagged, with nothing offered where the typings have no activeDocument",
            filename: "main.js",
            code: "document.createElement('div');",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" }, suggestions: [] }],
        },
    ],
});

// The recommended config runs prefer-create-el on .tsx, .mts and .cts files as
// well as on .ts ones. The files are stubs in a fixture project: a project
// service with allowDefaultProject would be shared with the rest of the run.
const otherExtensionsRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/ts-extensions` },
    },
});

otherExtensionsRuleTester.run("prefer-active-doc in .tsx, .mts and .cts files", preferActiveDocRule, {
    valid: [
        {
            name: "document.createElement() is left to prefer-create-el in a .tsx file",
            filename: "file.tsx",
            code: "document.createElement('div');",
        },
        {
            name: "document.createElement() is left to prefer-create-el in a .mts file",
            filename: "file.mts",
            code: "document.createElement('div');",
        },
        {
            name: "document.createElement() is left to prefer-create-el in a .cts file",
            filename: "file.cts",
            code: "document.createElement('div');",
        },
    ],
    invalid: [
        {
            // The fixture project has no obsidian typings, so no activeDocument.
            name: "document.body is still flagged in a .tsx file",
            filename: "file.tsx",
            code: "document.body;",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" }, suggestions: [] }],
        },
    ],
});

// The recommended config declares the browser's and Obsidian's globals. They
// are variables without a declaration in the file: still the globals.
const globalsRuleTester = new RuleTester({
    languageOptions: {
        globals: { ...globals.browser, activeDocument: "readonly" },
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/obsidian-project` },
    },
});

globalsRuleTester.run("prefer-active-doc with the recommended config's globals", preferActiveDocRule, {
    valid: [
        {
            name: "document.createElement() is left to prefer-create-el",
            code: "document.createElement('div');",
        },
    ],
    invalid: [
        {
            name: "document.body is forbidden",
            code: "document.body;",
            errors: [{
                messageId: "preferActive",
                data: { original: "document", replacement: "activeDocument" },
                suggestions: [{ messageId: "useActiveDocument", output: "activeDocument.body;" }],
            }],
        },
    ],
});

describe("prefer-active-doc where a comment turns prefer-create-el off", () => {
    const filename = path.join(process.cwd(), "file.ts");

    // Both rules as the recommended config runs them, under `obsidianmd/`, on a
    // TypeScript file with type information.
    function reported(lines: string[]): string[] {
        const messages = new Linter().verify(
            lines.join("\n") + "\n",
            [
                {
                    files: ["**/*.ts"],
                    languageOptions: {
                        parser: tseslint.parser,
                        parserOptions: {
                            project: "./tsconfig.json",
                            tsconfigRootDir: process.cwd(),
                            // With CI=true, typescript-eslint otherwise builds the program once
                            // from the files on disk and ignores the code linted here.
                            disallowAutomaticSingleRunInference: true,
                        },
                    },
                    linterOptions: { reportUnusedDisableDirectives: "error" },
                    plugins: {
                        obsidianmd: {
                            rules: { "prefer-active-doc": preferActiveDocRule, "prefer-create-el": preferCreateElRule },
                        } as unknown as ESLint.Plugin,
                    },
                    rules: { "obsidianmd/prefer-active-doc": "error", "obsidianmd/prefer-create-el": "error" },
                },
            ],
            filename,
        );
        assert.deepStrictEqual(messages.filter((m) => m.fatal).map((m) => m.message), []);
        return messages.map((m) => `${m.line}:${m.ruleId ?? "(directive)"}`);
    }

    it("without a comment, only prefer-create-el reports the call", () => {
        assert.deepStrictEqual(reported(['export const el = document.createElement("canvas");']), [
            "1:obsidianmd/prefer-create-el",
        ]);
    });

    it("eslint-disable-next-line for prefer-create-el leaves the call to prefer-active-doc", () => {
        assert.deepStrictEqual(
            reported([
                "// eslint-disable-next-line obsidianmd/prefer-create-el -- canvas size is set before use",
                'export const el = document.createElement("canvas");',
            ]),
            ["2:obsidianmd/prefer-active-doc"],
        );
    });

    it("eslint-disable-line for prefer-create-el, in a list with another rule", () => {
        assert.deepStrictEqual(
            reported(['export const el = document.createElement("canvas"); // eslint-disable-line no-console, obsidianmd/prefer-create-el']),
            // no-console is not enabled here, so its part of the comment is unused.
            ["1:obsidianmd/prefer-active-doc", "1:(directive)"],
        );
    });

    it("an eslint-disable/eslint-enable range for prefer-create-el", () => {
        assert.deepStrictEqual(
            reported([
                "/* eslint-disable obsidianmd/prefer-create-el -- sandbox code */",
                'export const a = document.createElement("style");',
                "/* eslint-enable obsidianmd/prefer-create-el -- host code */",
                'export const b = document.createElement("div");',
            ]),
            ["2:obsidianmd/prefer-active-doc", "4:obsidianmd/prefer-create-el"],
        );
    });

    it("a comment turning both rules off reports nothing", () => {
        assert.deepStrictEqual(
            reported([
                "// eslint-disable-next-line obsidianmd/prefer-create-el, obsidianmd/prefer-active-doc -- reason",
                'export const el = document.createElement("canvas");',
            ]),
            [],
        );
    });

    it("a comment for another rule leaves the call to prefer-create-el", () => {
        assert.deepStrictEqual(
            reported([
                "// eslint-disable-next-line no-console -- reason",
                'export const el = document.createElement("canvas");',
            ]),
            ["1:(directive)", "2:obsidianmd/prefer-create-el"],
        );
    });
});

// Listeners, found in a plugin upgraded to 0.5.0. A listener stays on the
// document it was added to, so `activeDocument` there would pick whichever
// window had focus at the time; the registration is still reported, since it
// only covers the main window. In a listener on the main window, `document` is
// the document of the window whose event it handles.
ruleTester.run("prefer-active-doc and listeners", preferActiveDocRule, {
    valid: [
        {
            name: "document read in a registerDomEvent listener on window",
            code: "declare const plugin: { registerDomEvent(t: unknown, e: string, f: () => void): void };\nexport function f() { plugin.registerDomEvent(window, 'focus', () => { if (document.visibilityState === 'visible') {} }); }",
        },
        {
            name: "document read in a window keydown listener, at any depth",
            code: "export function f() { window.addEventListener('keydown', (e) => { if (document.querySelector('.x')) return; setTimeout(() => document.body, 0); }, true); }",
        },
        {
            name: "document read in a named listener only added to and removed from window",
            code: "declare const plugin: { register(f: () => void): void };\nexport function f() { const onKey = (e: KeyboardEvent) => { if (document.querySelector('.x')) return; }; window.addEventListener('keydown', onKey, true); plugin.register(() => window.removeEventListener('keydown', onKey, true)); }",
        },
        {
            name: "document read in a function-expression listener on window",
            code: "export function f() { window.addEventListener('visibilitychange', function () { return document.hidden; }); }",
        },
    ],
    invalid: [
        {
            name: "registerDomEvent on document is reported without a suggestion, and the listener's own read is not reported",
            code: "declare const plugin: { registerDomEvent(t: unknown, e: string, f: () => void): void };\nexport function f() { plugin.registerDomEvent(document, 'visibilitychange', () => { if (document.visibilityState === 'visible') {} }); }",
            errors: [{ messageId: "preferActive", line: 2, column: 47, suggestions: [] }],
        },
        {
            name: "removeEventListener on document is reported without a suggestion",
            code: "declare const handler: () => void;\nexport function f() { document.removeEventListener('visibilitychange', handler); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a local variable that a listener is added to gets no suggestion",
            code: "declare const handler: () => void;\nexport function f() { const doc = document; doc.body.addClass('x'); doc.addEventListener('visibilitychange', handler); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a local variable used only to read gets the suggestion",
            code: "export function f() { const doc = document; return doc.body; }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "export function f() { const doc = activeDocument; return doc.body; }" }] }],
        },
        {
            name: "document read in a named listener also added to a pop-out's window is reported",
            code: "declare const win: Window;\nexport function f() { const onKey = () => document.body; window.addEventListener('keydown', onKey); win.addEventListener('keydown', onKey); }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "declare const win: Window;\nexport function f() { const onKey = () => activeDocument.body; window.addEventListener('keydown', onKey); win.addEventListener('keydown', onKey); }" }] }],
        },
        {
            name: "document read in a named listener that is also called is reported",
            code: "export function f() { const onKey = () => document.body; window.addEventListener('keydown', onKey); onKey(); }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "export function f() { const onKey = () => activeDocument.body; window.addEventListener('keydown', onKey); onKey(); }" }] }],
        },
        {
            name: "document read in a listener on activeWindow is reported: the listener follows focus, document does not",
            code: "export function f() { activeWindow.addEventListener('keydown', () => document.body); }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "export function f() { activeWindow.addEventListener('keydown', () => activeDocument.body); }" }] }],
        },
        {
            name: "document read in a listener on a local window is reported",
            code: "export function f(window: Window) { window.addEventListener('keydown', () => document.body); }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "export function f(window: Window) { window.addEventListener('keydown', () => activeDocument.body); }" }] }],
        },
        {
            name: "document read in an element's listener is reported",
            code: "export function f(el: HTMLElement) { el.addEventListener('click', () => document.body); }",
            errors: [{ messageId: "preferActive", suggestions: [{ messageId: "useActiveDocument", output: "export function f(el: HTMLElement) { el.addEventListener('click', () => activeDocument.body); }" }] }],
        },
    ],
});

// Found in a sweep of 600 plugins with 0.5.0: code that is correct as written,
// or a suggestion that would move the bug to another window.
const isConnected = (output: string) => [{ messageId: "useIsConnected" as const, output }];

ruleTester.run("prefer-active-doc and code that handles popout windows", preferActiveDocRule, {
    valid: [
        // The other choice to activeDocument: for an Obsidian without popout windows.
        {
            name: "requireApiVersion() ? activeDocument : document",
            code: "declare function requireApiVersion(v: string): boolean;\nexport function f() { return (requireApiVersion('0.15.0') ? activeDocument : document).body; }",
        },
        {
            name: "a condition with activeDocument in the other branch",
            code: "declare const old: boolean;\nexport const f = () => old ? document : activeDocument;",
        },
        {
            name: "after a check of activeDocument itself",
            code: "export const f = () => typeof activeDocument !== 'undefined' ? activeDocument : document;",
        },
        {
            name: "activeDocument ?? document",
            code: "export const f = () => (activeDocument ?? document).body;",
        },
        {
            name: "after window.activeDocument is tested",
            code: "export const f = () => (window as any).activeDocument ?? document;",
        },
        // Each window's document, the main one among them.
        {
            name: "document listed with the popout windows' documents",
            code: "declare function popoutDocuments(): Document[];\nexport function f() { const docs = [document, ...popoutDocuments()]; return docs; }",
        },
        {
            name: "a Set of document and activeDocument",
            code: "export function f() { for (const doc of new Set([document, activeDocument])) { doc.body; } }",
        },
        {
            name: "document listed with a window's document",
            code: "declare const win: Window;\nexport const docs = () => [document, win.document];",
        },
        // UI only the main window has.
        {
            name: "the status bar by class name",
            code: "export function f() { const statusBar = document.getElementsByClassName('status-bar')[0] as HTMLElement; statusBar.removeClass('x'); }",
        },
        {
            name: "the left split, removed from in onunload",
            code: "export function onunload() { document.getElementsByClassName('mod-left-split')[0]?.removeClass('theme-dark'); }",
        },
        {
            name: "a ribbon action by selector",
            code: "export const f = () => document.querySelector('.side-dock-ribbon .side-dock-ribbon-action');",
        },
        {
            name: "status bar items in the body, by a list of selectors that each name it",
            code: "export const f = () => document.body.querySelectorAll(`.status-bar-item.mod-x, div.status-bar > .y`);",
        },
        {
            name: "the right split and the ribbon",
            code: "export const f = () => [document.querySelector('.workspace-split.mod-right-split'), document.querySelector('.workspace-ribbon.mod-left')];",
        },
    ],
    invalid: [
        // A: a custom event bus on the main document.
        {
            name: "document.dispatchEvent gets no suggestion",
            code: "export function f() { document.dispatchEvent(new Event('SC-configuration-change')); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "dispatchEvent through a local variable gets no suggestion",
            code: "export function f() { const doc = document; doc.dispatchEvent(new CustomEvent('my-plugin:change')); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        // B: connectedness checks.
        {
            name: "document.contains(el) suggests el.isConnected",
            code: "declare const maps: { mapDiv: HTMLElement }[];\nexport const f = () => maps.filter((c) => document.contains(c.mapDiv));",
            errors: [{ messageId: "preferActive", suggestions: isConnected("declare const maps: { mapDiv: HTMLElement }[];\nexport const f = () => maps.filter((c) => c.mapDiv.isConnected);") }],
        },
        {
            name: "document.contains() of a cast keeps it in parentheses",
            code: "declare const x: unknown;\nexport const f = () => document.contains(x as Node);",
            errors: [{ messageId: "preferActive", suggestions: isConnected("declare const x: unknown;\nexport const f = () => (x as Node).isConnected;") }],
        },
        {
            name: "document.contains() of a node that may be null gets no suggestion",
            code: "export const f = (el: HTMLElement | null) => document.contains(el);",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document.contains() of an any gets no suggestion",
            code: "export const f = (el: any) => document.contains(el);",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "document.body.contains(el) && document.body.removeChild(el) gets no suggestion",
            code: "export const f = (el: Element) => el instanceof Node && document.body.contains(el) && document.body.removeChild(el);",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "perWindowState", data: { element: "body" }, suggestions: [] },
            ],
        },
        {
            name: "document.documentElement.contains(el) gets no suggestion",
            code: "export const f = (el: Element) => document.documentElement.contains(el);",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        // C: the document handed on as a value.
        {
            name: "an argument",
            code: "declare function registerDocumentEvents(doc: Document): void;\nexport function f() { registerDocumentEvents(document); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "the only element of a Set",
            code: "export function f() { return new Set<Document>([document]); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a default parameter",
            code: "export function f(doc: Document = document) { return doc.body; }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a property's value",
            code: "declare function render(o: object): void;\nexport function f() { render({ doc: document }); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "returned, also from an arrow function",
            code: "export function f() { return document; }\nexport let getDocuments = () => document;",
            errors: [{ messageId: "preferActive", suggestions: [] }, { messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "an argument chosen by a condition",
            code: "declare function use(d: Document): void; declare const el: HTMLElement | null;\nexport function f() { use(el ? el.doc : document); }",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a fallback in a local variable keeps the suggestion",
            code: "declare const el: HTMLElement | null;\nexport function f() { const doc = el?.doc ?? document; return doc.body; }",
            errors: [{ messageId: "preferActive", suggestions: offered("declare const el: HTMLElement | null;\nexport function f() { const doc = el?.doc ?? activeDocument; return doc.body; }") }],
        },
        {
            name: "a function that tells the main window from the others",
            code: "export function sync(newDoc: Document) { if (newDoc !== document) { for (const cls of document.body.classList) { newDoc.body.classList.add(cls); } } }",
            errors: [{ messageId: "preferActive", suggestions: [] }, { messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a comparison in another function does not count",
            code: "export function a(d: Document) { return d === document; }\nexport function b() { return document.body; }",
            errors: [{ messageId: "preferActive", suggestions: [] }, { messageId: "preferActive", suggestions: offered("export function a(d: Document) { return d === document; }\nexport function b() { return activeDocument.body; }") }],
        },
        {
            name: "a comparison with a local document does not count",
            code: "export function a(document: Document, d: Document) { const f = () => d === document; return [f, activeDocument]; }\nexport function b(d: Document) { if (d) { return document.body; } return null; }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function a(document: Document, d: Document) { const f = () => d === document; return [f, activeDocument]; }\nexport function b(d: Document) { if (d) { return activeDocument.body; } return null; }") }],
        },
        // D: lookups that only name UI of the main window in part, or not.
        {
            name: "a selector list with other UI is still reported",
            code: "export const f = () => document.querySelectorAll('.status-bar, .view-content');",
            errors: [{ messageId: "preferActive", suggestions: offered("export const f = () => activeDocument.querySelectorAll('.status-bar, .view-content');") }],
        },
        {
            name: "a selector that excludes the side docks is still reported",
            code: "export const f = () => document.querySelectorAll('.workspace-leaf:not(.mod-sidedock .workspace-leaf)');",
            errors: [{ messageId: "preferActive", suggestions: offered("export const f = () => activeDocument.querySelectorAll('.workspace-leaf:not(.mod-sidedock .workspace-leaf)');") }],
        },
        {
            name: "the titlebar is reported: a popout window has one too",
            code: "export const f = () => document.querySelector('.titlebar');",
            errors: [{ messageId: "preferActive", suggestions: offered("export const f = () => activeDocument.querySelector('.titlebar');") }],
        },
        {
            name: "a lookup in a variable is reported",
            code: "declare const cls: string;\nexport const f = () => document.getElementsByClassName(cls);",
            errors: [{ messageId: "preferActive", suggestions: offered("declare const cls: string;\nexport const f = () => activeDocument.getElementsByClassName(cls);") }],
        },
        // E: the state of the whole window.
        {
            name: "body classes added in onload and removed in onunload",
            code: "export function onload() { document.body.classList.add('image-captions-enabled'); }\nexport function onunload() { document.body.classList.remove('image-captions-enabled'); }",
            errors: [
                { messageId: "perWindowState", data: { element: "body" }, suggestions: [] },
                { messageId: "perWindowState", data: { element: "body" }, suggestions: [] },
            ],
        },
        {
            name: "Obsidian's class helpers and attributes on the body",
            code: "declare const on: boolean;\nexport function f() { document.body.toggleClass('x', on); document.body.setAttribute('data-x', ''); document.body.dataset.x = '1'; }",
            errors: [
                { messageId: "perWindowState", suggestions: [] },
                { messageId: "perWindowState", suggestions: [] },
                { messageId: "perWindowState", suggestions: [] },
            ],
        },
        {
            name: "CSS variables on the html element",
            code: "export function onunload() { document.documentElement.style.removeProperty('--image-converter-caption-color'); document.body.style.color = ''; }",
            errors: [
                { messageId: "perWindowState", data: { element: "documentElement" }, suggestions: [] },
                { messageId: "perWindowState", data: { element: "body" }, suggestions: [] },
            ],
        },
        {
            name: "a style element put in the head",
            code: "declare const style: HTMLStyleElement;\nexport function f() { document.head.appendChild(style); document.head.createEl('style'); }",
            errors: [
                { messageId: "perWindowState", data: { element: "head" }, suggestions: [] },
                { messageId: "perWindowState", data: { element: "head" }, suggestions: [] },
            ],
        },
        {
            name: "an injected element looked up to remove it",
            code: "export function onunload() { document.getElementById('my-plugin-style')?.remove(); document.head.querySelector('style.x')?.detach(); }",
            errors: [
                { messageId: "preferActive", suggestions: [] },
                { messageId: "preferActive", suggestions: [] },
            ],
        },
        {
            name: "a read of the body's classes keeps the suggestion",
            code: "export const f = () => document.body.hasClass('theme-dark') || document.body.classList.contains('x');",
            errors: [
                { messageId: "preferActive", suggestions: offered("export const f = () => activeDocument.body.hasClass('theme-dark') || document.body.classList.contains('x');") },
                { messageId: "preferActive", suggestions: offered("export const f = () => document.body.hasClass('theme-dark') || activeDocument.body.classList.contains('x');") },
            ],
        },
        {
            name: "a download link put in the body and removed again gets the suggestion",
            code: "export function download(a: HTMLAnchorElement) { document.body.appendChild(a); a.click(); a.remove(); }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function download(a: HTMLAnchorElement) { activeDocument.body.appendChild(a); a.click(); a.remove(); }") }],
        },
        {
            name: "a textarea put in the body to copy its text gets the suggestion",
            code: "export function copy(t: HTMLTextAreaElement) { document.body.append(t); t.select(); t.remove(); }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function copy(t: HTMLTextAreaElement) { activeDocument.body.append(t); t.select(); t.remove(); }") }],
        },
        {
            name: "an element put in the body and taken out with removeChild gets the suggestion on both",
            code: "export function copy(t: HTMLTextAreaElement) { document.body.appendChild(t); t.select(); document.body.removeChild(t); }",
            errors: [
                { messageId: "preferActive", suggestions: offered("export function copy(t: HTMLTextAreaElement) { activeDocument.body.appendChild(t); t.select(); document.body.removeChild(t); }") },
                { messageId: "preferActive", suggestions: offered("export function copy(t: HTMLTextAreaElement) { document.body.appendChild(t); t.select(); activeDocument.body.removeChild(t); }") },
            ],
        },
        {
            name: "an element removed later in a callback gets the suggestion",
            code: "export function flash(el: HTMLElement) { document.body.insertBefore(el, null); window.setTimeout(() => el.detach(), 1000); }",
            errors: [{ messageId: "preferActive", suggestions: offered("export function flash(el: HTMLElement) { activeDocument.body.insertBefore(el, null); window.setTimeout(() => el.detach(), 1000); }") }],
        },
        {
            name: "an element put in the body and never removed is the window's state",
            code: "declare const panel: HTMLElement;\nexport function onload() { document.body.appendChild(panel); }",
            errors: [{ messageId: "perWindowState", data: { element: "body" }, suggestions: [] }],
        },
        {
            name: "an element removed but put in the body through a call that is not followed is the window's state",
            code: "declare const el: HTMLElement;\nexport function f() { document.body.appendChild(el.cloneNode()); el.remove(); }",
            errors: [{ messageId: "perWindowState", data: { element: "body" }, suggestions: [] }],
        },
        {
            name: "a transient element in the head is still the window's state",
            code: "export function f(s: HTMLStyleElement) { document.head.appendChild(s); s.remove(); }",
            errors: [{ messageId: "perWindowState", data: { element: "head" }, suggestions: [] }],
        },
        {
            name: "a div created in the body keeps the suggestion",
            code: "export const f = () => document.body.createDiv('my-tooltip');",
            errors: [{ messageId: "preferActive", suggestions: offered("export const f = () => activeDocument.body.createDiv('my-tooltip');") }],
        },
        // F: activeDocument somewhere else than the other choice.
        {
            name: "a condition on something else is still reported",
            code: "declare const el: HTMLElement | null;\nexport const f = () => (el ? el.doc : document).body;",
            errors: [{ messageId: "preferActive", suggestions: offered("declare const el: HTMLElement | null;\nexport const f = () => (el ? el.doc : activeDocument).body;") }],
        },
        {
            name: "document.body after a check of activeDocument is reported, without a suggestion",
            code: "export const f = () => typeof activeDocument !== 'undefined' ? activeDocument.body : document.body;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
        {
            name: "a local activeDocument is not the global",
            code: "export const f = (activeDocument: Document | null) => (activeDocument ?? document).body;",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
    ],
});

// Without type information, `document.contains(el)` cannot tell that `el` is
// a node, never null.
new RuleTester().run("prefer-active-doc document.contains without type information", preferActiveDocRule, {
    valid: [],
    invalid: [
        {
            name: "no suggestion",
            code: "export const f = (el) => document.contains(el);",
            errors: [{ messageId: "preferActive", suggestions: [] }],
        },
    ],
});
