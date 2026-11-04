import assert from "node:assert";
import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { type ESLint, Linter } from "eslint";
import { describe, it } from "mocha";
import globals from "globals";
import tseslint from "typescript-eslint";
import preferActiveDocRule from "../lib/rules/preferActiveDoc.js";
import preferCreateElRule from "../lib/rules/preferCreateEl.js";

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
            name: "a document member as an argument to createElement is still flagged",
            code: "el.createElement(document.title);",
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

// The recommended config runs prefer-create-el on .tsx, .mts and .cts files as
// well as on .ts ones.
const otherExtensionsRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: {
            project: null,
            projectService: { allowDefaultProject: ["*.tsx", "*.mts", "*.cts"] },
            tsconfigRootDir: process.cwd(),
        },
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
            name: "document.body is still flagged in a .tsx file",
            filename: "file.tsx",
            code: "document.body;",
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
        },
    ],
});

// The recommended config declares the browser's and Obsidian's globals. They
// are variables without a declaration in the file: still the globals.
const globalsRuleTester = new RuleTester({
    languageOptions: { globals: { ...globals.browser, activeDocument: "readonly" } },
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
            errors: [{ messageId: "preferActive", data: { original: "document", replacement: "activeDocument" } }],
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
