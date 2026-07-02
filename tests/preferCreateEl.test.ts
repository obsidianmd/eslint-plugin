import { RuleTester } from "@typescript-eslint/rule-tester";
import preferCreateEl from "../lib/rules/preferCreateEl.js";

const ruleTester = new RuleTester();

const MOCK_OBSIDIAN_DOM = `
    declare global {
        interface Node {
            createEl(tag: string, o?: any): HTMLElement;
            createDiv(o?: any): HTMLDivElement;
            createSpan(o?: any): HTMLSpanElement;
            createSvg(tag: string, o?: any): SVGElement;
        }
        interface Document {
            createEl(tag: string, o?: any): HTMLElement;
            createDiv(o?: any): HTMLDivElement;
            createSpan(o?: any): HTMLSpanElement;
            createSvg(tag: string, o?: any): SVGElement;
        }
        function createEl(tag: string, o?: any): HTMLElement;
        function createDiv(o?: any): HTMLDivElement;
        function createSpan(o?: any): HTMLSpanElement;
        function createSvg(tag: string, o?: any): SVGElement;
        function createFragment(): DocumentFragment;
    }
    export {};
`;

ruleTester.run("prefer-create-el", preferCreateEl, {
    valid: [
        {
            name: "createEl is allowed",
            code: "createEl('p');",
        },
        {
            name: "activeDocument.createEl is allowed",
            code: "activeDocument.createEl('p');",
        },
        {
            name: "createDiv is allowed",
            code: "createDiv();",
        },
        {
            name: "createSpan is allowed",
            code: "createSpan();",
        },
        {
            name: "el.createDiv is allowed",
            code: "el.createDiv();",
        },
        {
            name: "createFragment is allowed",
            code: "createFragment();",
        },
        {
            name: "React.createElement is not flagged",
            code: "React.createElement('div');",
        },
        {
            name: "local document variable is not flagged",
            code: "const document = getDoc(); document.createElement('p');",
        },
        {
            name: "createElement with multiple args is not flagged",
            code: "document.createElement('div', { is: 'my-div' });",
        },
        {
            name: "createEl with non-shorthand tag is allowed",
            code: "createEl('p');",
        },
        {
            name: "el.createEl with non-shorthand tag is allowed",
            code: "el.createEl('p');",
        },
        {
            name: "createEl with variable tag is allowed",
            code: "createEl(tag);",
        },
        {
            name: "createSvg is allowed",
            code: "createSvg('path');",
        },
        {
            name: "createElementNS with non-SVG namespace is not flagged",
            code: "document.createElementNS('http://www.w3.org/1999/xhtml', 'div');",
        },
        {
            name: "createElementNS on non-document object is not flagged",
            code: "React.createElementNS('http://www.w3.org/2000/svg', 'path');",
        },
        {
            name: "createElement on a non-Document typed object is not flagged",
            code: "declare const notDoc: { createElement(tag: string): unknown; };\nnotDoc.createElement('p');",
        },
    ],
    invalid: [
        // --- With Obsidian augmentations: autofix ---

        // createElement → createEl (with Obsidian types)
        {
            name: "document.createElement(tag) → createEl(tag) with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElement('div') → createDiv() with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElement('span') → createSpan() with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('span');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateSpan();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createElementNS (SVG) → createSvg (with Obsidian types)
        {
            name: "document.createElementNS(SVG_NS, tag) → createSvg(tag) with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElementNS('http://www.w3.org/2000/svg', 'path');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateSvg('path');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createDocumentFragment → createFragment (with Obsidian types)
        {
            name: "document.createDocumentFragment() → createFragment() with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createDocumentFragment();`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateFragment();`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- activeDocument: always autofix (Obsidian-only identifier) ---
        {
            name: "activeDocument.createElement(tag) → activeWindow.createEl(tag)",
            code: "activeDocument.createElement('p');",
            output: "activeWindow.createEl('p');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('div') → activeWindow.createDiv()",
            code: "activeDocument.createElement('div');",
            output: "activeWindow.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('span') → activeWindow.createSpan()",
            code: "activeDocument.createElement('span');",
            output: "activeWindow.createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) → activeWindow.createSvg(tag)",
            code: "activeDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');",
            output: "activeWindow.createSvg('svg');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createDocumentFragment() → activeWindow.createFragment()",
            code: "activeDocument.createDocumentFragment();",
            output: "activeWindow.createFragment();",
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- Document-typed variable: use `doc.win.<helper>()` ---
        {
            name: "doc.createElement(tag) → doc.win.createEl(tag) for a Document variable with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "doc.createElement('div') → doc.win.createDiv() for a Document variable with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.win.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "doc.createElementNS(SVG_NS, tag) → doc.win.createSvg(tag) for a Document variable with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.createElementNS('http://www.w3.org/2000/svg', 'path');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.win.createSvg('path');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "doc.createDocumentFragment() → doc.win.createFragment() for a Document variable with Obsidian types",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.createDocumentFragment();`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.win.createFragment();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "doc.createElement without Obsidian types offers suggestion for a Document variable",
            code: `declare const doc: Document;\ndoc.createElement('p');`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `declare const doc: Document;\ndoc.win.createEl('p');`,
                        },
                    ],
                },
            ],
        },

        {
            name: "complex Document expression is parenthesized in autofix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const cond: boolean;\ndeclare const a: Document & { win: typeof globalThis };\ndeclare const b: Document & { win: typeof globalThis };\n(cond ? a : b).createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const cond: boolean;\ndeclare const a: Document & { win: typeof globalThis };\ndeclare const b: Document & { win: typeof globalThis };\n(cond ? a : b).win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- createEl shorthand: always autofix (already Obsidian API) ---
        {
            name: "createEl('div') → createDiv()",
            code: "createEl('div');",
            output: "createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('span') → createSpan()",
            code: "createEl('span');",
            output: "createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('div', opts) → createDiv(opts)",
            code: "createEl('div', { cls: 'foo' });",
            output: "createDiv({ cls: 'foo' });",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "el.createEl('div') → el.createDiv()",
            code: "el.createEl('div');",
            output: "el.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "el.createEl('span', opts) → el.createSpan(opts)",
            code: "el.createEl('span', { text: 'hi' });",
            output: "el.createSpan({ text: 'hi' });",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createEl('div') → createDiv()",
            code: "document.createEl('div');",
            output: "createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "this.containerEl.createEl('div') → this.containerEl.createDiv()",
            code: "this.containerEl.createEl('div');",
            output: "this.containerEl.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "complex expression is parenthesized in createEl shorthand autofix",
            code: "(cond ? a : b).createEl('div');",
            output: "(cond ? a : b).createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "super.createEl('div') → super.createDiv() (not parenthesized)",
            code: "class C extends B { m() { super.createEl('div'); } }",
            output: "class C extends B { m() { super.createDiv(); } }",
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- Without Obsidian augmentations: suggestion only ---
        {
            name: "document.createElement without Obsidian types offers suggestion instead of autofix",
            code: "document.createElement('p');",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "createEl('p');",
                        },
                    ],
                },
            ],
        },
        {
            name: "document.createElement('div') without Obsidian types offers suggestion instead of autofix",
            code: "document.createElement('div');",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "createDiv();",
                        },
                    ],
                },
            ],
        },
        {
            name: "document.createElementNS(SVG_NS) without Obsidian types offers suggestion instead of autofix",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "createSvg('path');",
                        },
                    ],
                },
            ],
        },
        {
            name: "document.createDocumentFragment() without Obsidian types offers suggestion instead of autofix",
            code: "document.createDocumentFragment();",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "createFragment();",
                        },
                    ],
                },
            ],
        },
        {
            name: "document.createElementNS(SVG_NS, tag) with variable without Obsidian types offers suggestion",
            code: "document.createElementNS('http://www.w3.org/2000/svg', tag);",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "createSvg(tag);",
                        },
                    ],
                },
            ],
        },
    ],
});
