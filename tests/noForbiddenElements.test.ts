import { RuleTester } from "@typescript-eslint/rule-tester";
import noForbiddenElements from "lib/rules/noForbiddenElements.js";

const ruleTester = new RuleTester();

ruleTester.run("no-forbidden-elements", noForbiddenElements, {
    valid: [
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
    ],
    invalid: [
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
            name: "stylesheet link element with appendChild is forbidden",
            code: "const styleSheet = document.createElement('link');\n styleSheet.rel = 'stylesheet';\n styleSheet.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);\n document.head.appendChild(styleSheet);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        }
    ],
});
