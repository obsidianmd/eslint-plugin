import { RuleTester } from "@typescript-eslint/rule-tester";
import globals from "globals";
import noForbiddenElements from "lib/rules/noForbiddenElements.js";

const ruleTester = new RuleTester();

ruleTester.run("no-forbidden-elements", noForbiddenElements, {
    valid: [
        // --- A shadow root, which styles.css does not reach ---
        {
            name: "a <style> in a shadow root's head is allowed (callout-manager)",
            code: "class P { shadowRoot: ShadowRoot; shadowHead: HTMLElement; customStyleEl: HTMLStyleElement;\n  constructor(frag: DocumentFragment) {\n    const shadowHostEl = frag.createDiv();\n    const shadowRoot = (this.shadowRoot = shadowHostEl.attachShadow({ delegatesFocus: false, mode: 'closed' }));\n    const shadowHead = (this.shadowHead = shadowRoot.createEl('head'));\n    shadowHead.createEl('style', { text: CSS });\n    this.customStyleEl = shadowHead.createEl('style', { attr: { 'data-custom-styles': 'true' } });\n  } }",
        },
        {
            name: "createEl('style') on attachShadow() or el.shadowRoot is allowed",
            code: "host.attachShadow({ mode: 'open' }).createEl('style'); el.shadowRoot!.createEl('style'); this.el.shadowRoot?.createEl('link', { attr: { rel: 'stylesheet' } });",
        },
        {
            name: "createEl('style') on a parameter typed ShadowRoot is allowed",
            code: "function style(root: ShadowRoot) { root.createEl('style', { text: css }); }",
        },
        {
            name: "a created <style> appended only to a shadow root is allowed",
            code: "const shadow = host.attachShadow({ mode: 'open' });\nconst style = document.createElement('style');\nstyle.textContent = css;\nshadow.appendChild(style);\nshadowRoot.append(document.createElement('style'));",
        },
        {
            name: "createElement('p') is allowed",
            code: "const style = document.createElement('p'); document.head.appendChild(style);",
        },
        {
            name: "createEl('p') is allowed",
            code: "const style = document.createEl('p');",
        },
        {
            name: "activeDocument.createElement('div') is allowed",
            code: "const div = activeDocument.createElement('div');",
        },
        {
            name: "el.doc.createElement('span') is allowed",
            code: "const span = this.containerEl.doc.createElement('span');",
        },
        {
            name: "global createEl('div') is allowed",
            code: "const div = createEl('div');",
        },
        {
            name: "a tag name held in a variable is not followed",
            code: "const tag = 'style'; activeDocument.createElement(tag); createEl(tag);",
        },
        {
            name: "a document held in a variable is not followed",
            code: "const doc = this.containerEl.doc; const style = doc.createElement('style');",
        },
        {
            name: "an iframe's contentDocument is not the plugin's document",
            code: "const style = iframe.contentDocument.createElement('style');",
        },
        {
            name: "createElement on an object that is not a document is not reported",
            code: "const style = factory.createElement('style');",
        },
        {
            name: "a locally defined createEl is not Obsidian's",
            code: "function createEl(tag: string) { return tag; }\nconst style = createEl('style');",
        },
        {
            name: "an imported createEl is not Obsidian's",
            code: "import { createEl } from './dom';\nconst style = createEl('style');",
        },
        {
            name: "global createEl() without arguments is not reported",
            code: "const el = createEl();",
        },
        {
            name: "a template literal with an expression is not a literal tag name",
            code: "document.createElement(`${tag}`); createEl(`st${suffix}`); containerEl.createEl(`${tag}`);",
        },
        {
            name: "createElement on a call result is not a document",
            code: "const style = getFactory().createElement('style');",
        },
        {
            name: "createEl('div') on a call result is allowed",
            code: "const div = containerEl.createDiv().createEl('div');",
        },
        {
            name: "createElement() and createEl() without arguments are not reported",
            code: "document.createElement(); containerEl.createEl();",
        },
        {
            name: "a template literal that starts with a forbidden tag and has an expression is not a literal tag name",
            code: "document.createElement(`style${suffix}`); createEl(`link${suffix}`); containerEl.createEl(`style${suffix}`);",
        },
        {
            name: "a tag that is not a string is not reported",
            code: "document.createElement(0 as never); createEl(null as never); containerEl.createEl(1 as never);",
        },
        {
            name: "a custom element whose name starts with a forbidden tag is allowed",
            code: "document.createElement('style-editor'); createEl('link-preview'); containerEl.createEl('style-panel');",
        },
        {
            name: "another bare function called with a forbidden tag is not reported",
            code: "log('style'); render('link');",
        },
        {
            name: "a locally defined const createEl is not Obsidian's",
            code: "const createEl = (tag: string) => tag;\nconst style = createEl('style');",
        },
        {
            name: "a computed member named like a document property is not followed",
            code: "const style = docs[doc].createElement('style');",
        },
    ],
    invalid: [
        // --- Not in a shadow root ---
        {
            name: "a created <style> appended to a shadow root and to the document head is reported",
            code: "const shadow = host.attachShadow({ mode: 'open' });\nconst style = document.createElement('style');\nshadow.appendChild(style);\ndocument.head.appendChild(style.cloneNode());\ndocument.head.appendChild(style);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }],
        },
        {
            name: "a created <style> never inserted in the file is reported",
            code: "const style = document.createElement('style'); export { style };",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }],
        },
        {
            name: "a host element or a let that may change is not a shadow root",
            code: "const host = containerEl.createDiv(); host.attachShadow({ mode: 'open' }); host.createEl('style');\nlet root = el.shadowRoot; root = el; root.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }, { messageId: "doNotAttachForbiddenStyleElements" }],
        },
        {
            name: "createElement('style') with appendChild is forbidden",
            code: "const style = document.createElement('style'); document.head.appendChild(style);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createElement('link') with appendChild is forbidden",
            code: "const p = document.createElement('link'); document.head.appendChild(p);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createElement('link') with div.appendChild is forbidden",
            code: "const div = document.createElement('div'); const link = document.createElement('link'); div.appendChild(link);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createEl('style') is forbidden",
            code: "const style = document.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "document.head.createEl('style') is forbidden",
            code: "const style = document.head.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "document.head.createEl('style') with args is forbidden",
            code: "const style = document.head.createEl('style', { some: \"other arg\"});",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createEl('Link') on an element, in another case, is forbidden",
            code: "const link = containerEl.createEl('Link');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "this.containerEl.createEl('style') is forbidden",
            code: "const style = this.containerEl.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "activeDocument.createElement('style') is forbidden",
            code: "const style = activeDocument.createElement('style'); activeDocument.head.appendChild(style);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } }]
        },
        {
            name: "window.document.createElement('style') is forbidden",
            code: "const style = window.document.createElement('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "activeWindow.document.createElement('link') is forbidden",
            code: "const link = activeWindow.document.createElement('link');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } }]
        },
        {
            name: "window.activeDocument.createElement('style') is forbidden",
            code: "const style = window.activeDocument.createElement('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "el.doc.createElement('style') is forbidden",
            code: "const style = this.containerEl.doc.createElement('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "el.ownerDocument.createElement('STYLE') is forbidden",
            code: "const style = el.ownerDocument.createElement('STYLE');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } }]
        },
        {
            name: "a non-null or optional ownerDocument is still a document",
            code: "node.ownerDocument!.createElement('style'); node.ownerDocument?.createElement('link');",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
            ]
        },
        {
            name: "global createEl('style') is forbidden",
            code: "const style = createEl('style', { text: '.my-plugin { color: red; }' });",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } }]
        },
        {
            name: "global createEl('link') inside a function is forbidden",
            code: "function load() { document.head.appendChild(createEl('link', { attr: { rel: 'stylesheet' } })); }",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } }]
        },
        {
            name: "an ambient createEl declaration is still Obsidian's global",
            code: "declare function createEl(tag: string): HTMLElement;\nconst style = createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "an ambient declare const createEl is still Obsidian's global",
            code: "declare const createEl: (tag: string) => HTMLElement;\nconst style = createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } }]
        },
        {
            name: "a document or a tag name with satisfies is still a document and a literal tag name",
            code: "(activeDocument satisfies Document).createElement('style'); createEl('link' satisfies string);",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
            ]
        },
        {
            name: "createEl('style') on the element a call returns is forbidden",
            code: "const style = containerEl.createDiv().createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } }]
        },
        {
            name: "createEl('link') on a chain of calls is forbidden",
            code: "this.containerEl.createDiv({ cls: 'wrapper' }).createSpan().createEl('link', { attr: { rel: 'stylesheet' } });",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } }]
        },
        {
            name: "createEl('style') on a non-null, cast or optional receiver is forbidden",
            code: "el!.createEl('style'); (el as HTMLElement).createEl('style'); getEl()?.createEl('style'); this.createEl('style');",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
            ]
        },
        {
            name: "createElement on a document cast to Document is forbidden",
            code: "(activeWindow.document as Document).createElement('style'); (<Document>el.doc).createElement('link');",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
            ]
        },
        {
            name: "a template literal without expressions is a literal tag name",
            code: "document.createElement(`style`); createEl(`link`); containerEl.createEl(`STYLE`);",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
            ]
        },
        {
            name: "a literal tag name with a type assertion is still a literal tag name",
            code: "createEl('style' as keyof HTMLElementTagNameMap); document.createElement('link' as const);",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
            ]
        },
        {
            name: "stylesheet link element with appendChild is forbidden",
            code: "const styleSheet = document.createElement('link');\n styleSheet.rel = 'stylesheet';\n styleSheet.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);\n document.head.appendChild(styleSheet);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        }
    ],
});

// The recommended config declares Obsidian's globals, createEl among them. A
// global is a variable without a declaration in the file: still Obsidian's.
const globalsRuleTester = new RuleTester({
    languageOptions: { globals: { ...globals.browser, activeDocument: "readonly", createEl: "readonly" } },
});

globalsRuleTester.run("no-forbidden-elements with the recommended config's globals", noForbiddenElements, {
    valid: [],
    invalid: [
        {
            name: "global createEl('style') and document.createElement('link') are forbidden",
            code: "createEl('style'); document.createElement('link'); activeDocument.createElement('style');",
            errors: [
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "link" } },
                { messageId: "doNotAttachForbiddenStyleElements", data: { element: "style" } },
            ],
        },
    ],
});
