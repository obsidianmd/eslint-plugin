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

// Obsidian's own declarations: activeDocument.win and activeWindow are a plain
// Window, without the DOM helpers.
const MOCK_ACTIVE_WINDOW_PLAIN = `
    declare global {
        interface Document {
            win: Window;
        }
        var activeDocument: Document;
        var activeWindow: Window;
    }
    export {};
`;

// A project that declares the helpers on Window itself.
const MOCK_ACTIVE_WINDOW_WITH_HELPERS = `
    declare global {
        interface Document {
            win: Window;
        }
        interface Window {
            createEl(tag: string, o?: any): HTMLElement;
            createDiv(o?: any): HTMLDivElement;
            createSpan(o?: any): HTMLSpanElement;
            createSvg(tag: string, o?: any): SVGElement;
            createFragment(): DocumentFragment;
        }
        var activeDocument: Document;
        var activeWindow: Window;
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
            name: "createEl with a tag named like an Object.prototype member is allowed",
            code: "createEl('toString'); el.createEl('constructor'); document.createEl('__proto__');",
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

        // --- An iframe's document has no Obsidian DOM helpers (#196) ---
        {
            name: "iframe.contentDocument!.createElement is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.contentDocument!.createElement('style');`,
        },
        {
            name: "iframe.contentDocument?.createElement is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.contentDocument?.createElement('style');`,
        },
        {
            name: "a const holding iframe.contentDocument is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst doc = iframe.contentDocument!;\ndoc.createElement('style');`,
        },
        {
            name: "a nullable const holding iframe.contentDocument is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst doc = iframe.contentDocument;\nif (doc) { doc.head.appendChild(doc.createElement('style')); }`,
        },
        {
            name: "iframe.contentWindow.document is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.contentWindow!.document.createElement('style');`,
        },
        {
            name: "a destructured contentDocument is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst { contentDocument } = iframe;\ncontentDocument!.createElement('style');`,
        },
        {
            name: "a renamed destructured contentDocument is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst { contentDocument: frameDoc } = iframe;\nframeDoc!.createDocumentFragment();`,
        },
        {
            name: "an asserted iframe document is not flagged for createElementNS",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\n(iframe.contentDocument as Document).createElementNS('http://www.w3.org/2000/svg', 'path');`,
        },
        {
            name: "a nullable const holding iframe.contentDocument is not flagged with ?.",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst doc = iframe.contentDocument;\ndoc?.createElement('style');`,
        },
        {
            name: "a nullable object that is not a document is not flagged",
            code: "declare const notDoc: { createElement(tag: string): unknown } | null;\nnotDoc?.createElement('p');",
        },
        {
            name: "a nullable union of a document and another object is not flagged",
            code: "declare const maybeDoc: Document | { createElement(tag: string): HTMLElement } | null;\nmaybeDoc?.createElement('p');",
        },
        {
            name: "an iframe document is not flagged without Obsidian types",
            code: `declare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.contentDocument!.createElement('div');`,
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

        // --- The helper's name bound locally: reported, no fix or suggestion ---
        // The bare replacement would call the local binding, e.g. recurse into the
        // enclosing function (TS7023).
        {
            name: "inside a function named createDiv, createElement('div') is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\nfunction createDiv(): HTMLDivElement { return document.createElement('div'); }`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "a const named createEl in scope leaves createElement(tag) without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\nconst createEl = (tag: string) => tag;\ndocument.createElement('p');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "a parameter named createSpan leaves createElement('span') without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\nfunction make(createSpan: unknown) { return document.createElement('span'); }`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "a named function expression createFragment leaves createDocumentFragment() without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\nconst make = function createFragment() { return document.createDocumentFragment(); };`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "an imported createSvg leaves createElementNS() without a fix",
            code: `import { createSvg } from './svg';\n${MOCK_OBSIDIAN_DOM}\ndocument.createElementNS('http://www.w3.org/2000/svg', 'path');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        // A method is not a binding: the bare call inside it reaches the global.
        {
            name: "inside a class method named createDiv, createElement('div') is still fixed",
            code: `${MOCK_OBSIDIAN_DOM}\nclass View { createDiv() { return document.createElement('div'); } }`,
            output: `${MOCK_OBSIDIAN_DOM}\nclass View { createDiv() { return createDiv(); } }`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "inside an object method named createDiv, createElement('div') is still fixed",
            code: `${MOCK_OBSIDIAN_DOM}\nconst dom = { createDiv() { return document.createElement('div'); } };`,
            output: `${MOCK_OBSIDIAN_DOM}\nconst dom = { createDiv() { return createDiv(); } };`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // An ambient declaration has no body: the call still reaches the global.
        {
            name: "an ambient declare function createDiv does not stop the fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare function createDiv(o?: any): HTMLDivElement;\ndocument.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare function createDiv(o?: any): HTMLDivElement;\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a prefixed replacement is fixed even when the bare name is bound locally",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nfunction createDiv() { return activeDocument.createElement('div'); }`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nfunction createDiv() { return activeWindow.createDiv(); }`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- Tags createEl()/createSvg() do not accept: reported, no fix or suggestion ---
        // createEl<K extends keyof HTMLElementTagNameMap>(tag: K) rejects these, so
        // createEl(tag) would fail tsc with TS2345.
        {
            name: "document.createElement(tag) with a string tag is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const tag: string;\ndocument.createElement(tag);`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "document.createElement() with a custom element name is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('my-element');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "document.createElement() with a tag named like an Object.prototype member is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('constructor');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", data: { replacement: "createEl('constructor')", original: "document.createElement('constructor')" }, suggestions: [] }],
        },
        {
            name: "document.createElement() with a deprecated tag is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('xmp');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "document.createElement(tag) with a union of known tags still autofixes",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const tag: 'p' | 'section';\ndocument.createElement(tag);`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const tag: 'p' | 'section';\ncreateEl(tag);`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElementNS(SVG_NS, name) with a string name is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const name: string;\ndocument.createElementNS('http://www.w3.org/2000/svg', name);`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "document.createElementNS(SVG_NS, tag, options) is reported without a fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElementNS('http://www.w3.org/2000/svg', 'path', { is: 'x-path' });`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },

        // --- activeDocument: activeWindow.<helper>() when activeWindow's type has the helpers ---
        {
            name: "activeDocument.createElement(tag) → activeWindow.createEl('p') when Window declares the helpers",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createElement('p');`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('div') → activeWindow.createDiv() when Window declares the helpers",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createElement('div');`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('span') → activeWindow.createSpan() when Window declares the helpers",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createElement('span');`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createSpan();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) → activeWindow.createSvg('svg') when Window declares the helpers",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createSvg('svg');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createDocumentFragment() → activeWindow.createFragment() when Window declares the helpers",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createDocumentFragment();`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createFragment();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // obsidian.d.ts types activeWindow as a plain Window, so the fix would not compile.
        {
            name: "activeDocument.createElement(tag) with Obsidian's own types offers activeWindow.createEl('p') as a suggestion",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('p');`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveWindow.createEl('p');`,
                        },
                    ],
                },
            ],
        },
        {
            name: "activeDocument.createElement('div') with Obsidian's own types offers activeWindow.createDiv() as a suggestion",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('div');`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveWindow.createDiv();`,
                        },
                    ],
                },
            ],
        },
        {
            name: "activeDocument.createElement('span') with Obsidian's own types offers activeWindow.createSpan() as a suggestion",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('span');`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveWindow.createSpan();`,
                        },
                    ],
                },
            ],
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) with Obsidian's own types offers activeWindow.createSvg('svg') as a suggestion",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveWindow.createSvg('svg');`,
                        },
                    ],
                },
            ],
        },
        {
            name: "activeDocument.createDocumentFragment() with Obsidian's own types offers activeWindow.createFragment() as a suggestion",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createDocumentFragment();`,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveWindow.createFragment();`,
                        },
                    ],
                },
            ],
        },
        {
            name: "activeDocument without any types offers a suggestion",
            code: "activeDocument.createElement('span');",
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "activeWindow.createSpan();",
                        },
                    ],
                },
            ],
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

        // --- createEl shorthand on an untyped receiver, or with no helper declared anywhere: fixed ---
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

        // --- Near misses: documents that do have Obsidian DOM helpers (#196) ---
        {
            name: "the iframe's ownerDocument is still flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.ownerDocument.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe.ownerDocument.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a let holding iframe.contentDocument is still flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nlet doc = iframe.contentDocument!;\ndoc.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nlet doc = iframe.contentDocument!;\ndoc.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a document that is not an iframe's is still flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\ndeclare const other: { document: Document };\nother.document.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\ndeclare const other: { document: Document };\nother.document.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- An optional chain keeps its `?.` ---
        {
            name: "doc?.createElement(tag) keeps the optional chain",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\nconst el = doc?.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\nconst el = doc?.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- A document that may be null or undefined ---
        // A union with null has no `defaultView` of its own, so these were
        // never reported.
        {
            name: "a nullable document's doc?.createElement(tag) → doc?.win.createEl(tag)",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null;\nconst el = doc?.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null;\nconst el = doc?.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl", data: { replacement: "doc?.win.createEl('p')", original: "doc?.createElement('p')" } }],
        },
        {
            name: "an optional document parameter's doc?.createElement('div') → doc?.win.createDiv()",
            code: `${MOCK_OBSIDIAN_DOM}\nfunction make(doc?: Document & { win: typeof globalThis }) { return doc?.createElement('div'); }`,
            output: `${MOCK_OBSIDIAN_DOM}\nfunction make(doc?: Document & { win: typeof globalThis }) { return doc?.win.createDiv(); }`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a document that may be undefined: doc?.createElementNS(SVG_NS, tag) → doc?.win.createSvg(tag)",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | undefined;\ndoc?.createElementNS('http://www.w3.org/2000/svg', 'path');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | undefined;\ndoc?.win.createSvg('path');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a nullable document's doc?.createDocumentFragment() → doc?.win.createFragment()",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null | undefined;\ndoc?.createDocumentFragment();`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null | undefined;\ndoc?.win.createFragment();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a document reached through an optional chain keeps the chain",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const view: { doc: Document & { win: typeof globalThis } } | undefined;\nconst el = view?.doc.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const view: { doc: Document & { win: typeof globalThis } } | undefined;\nconst el = view?.doc.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // TypeScript reports `doc.createElement()` on a nullable document
        // (TS18047); `doc.win` reads the same value and gets the same error.
        {
            name: "a nullable document without ?. is fixed with the same receiver",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null;\ndoc.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null;\ndoc.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a nullable document without Obsidian types gets a suggestion that keeps ?.",
            code: `declare const doc: Document | null;\ndoc?.createElement('p');`,
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `declare const doc: Document | null;\ndoc?.win.createEl('p');`,
                        },
                    ],
                },
            ],
        },
        {
            name: "a node's ownerDocument, which may be null, gets a suggestion with Obsidian's types",
            code: `import "obsidian";\ndeclare const node: Node;\nnode.ownerDocument?.createElement('p');`,
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `import "obsidian";\ndeclare const node: Node;\nnode.ownerDocument?.win.createEl('p');`,
                        },
                    ],
                },
            ],
        },
        {
            name: "a string tag on a nullable document gets neither a fix nor a suggestion",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: (Document & { win: typeof globalThis }) | null;\ndeclare const tag: string;\ndoc?.createElement(tag);`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },

        // --- The global document declares createEl but no global helper does ---
        {
            name: "document.createElement('div') without a global createDiv offers a suggestion",
            code: "declare global { interface Document { createEl(tag: string): HTMLElement; } }\nexport {};\ndocument.createElement('div');",
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "declare global { interface Document { createEl(tag: string): HTMLElement; } }\nexport {};\ncreateDiv();",
                        },
                    ],
                },
            ],
        },
    ],
});

// Obsidian's own declarations: the shorthands with Obsidian's types.
const OBSIDIAN = `import "obsidian";\n`;

// A test mock's helpers (pfrankov/obsidian-ai-providers): createSpan() takes
// only a class name, so createSpan({ text }) fails with TS2345.
const MOCK_CLASS_NAME_HELPERS = `
    declare global {
        interface HTMLElement {
            createEl(tag: string, attrs?: { text?: string }, cls?: string): HTMLElement;
            createSpan(className?: string): HTMLElement;
        }
    }
    export {};
`;

ruleTester.run("prefer-create-el: createEl() shorthands", preferCreateEl, {
    valid: [],
    invalid: [
        // --- With Obsidian's types: fixed ---
        {
            name: "el.createEl('div', opts) → el.createDiv(opts) with Obsidian's types",
            code: `${OBSIDIAN}declare const containerEl: HTMLElement;\nconst helpEl = containerEl.createEl('div', { cls: 'setting-item-description' });`,
            output: `${OBSIDIAN}declare const containerEl: HTMLElement;\nconst helpEl = containerEl.createDiv({ cls: 'setting-item-description' });`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('span', opts, callback) → createSpan(opts, callback) with Obsidian's types",
            code: `${OBSIDIAN}const span = createEl('span', { text: 'hi' }, (el) => el.addClass('x'));`,
            output: `${OBSIDIAN}const span = createSpan({ text: 'hi' }, (el) => el.addClass('x'));`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a fragment's createEl('div') → createDiv() with Obsidian's types",
            code: `${OBSIDIAN}const frag = createFragment();\nfrag.createEl('div', 'note');`,
            output: `${OBSIDIAN}const frag = createFragment();\nfrag.createDiv('note');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // The fix dropped the `?.` and failed with TS18047.
        {
            name: "el?.createEl('div', opts) keeps the optional chain",
            code: `${OBSIDIAN}declare const text: { inputEl: HTMLInputElement };\nconst eyeIcon = text.inputEl.parentElement?.createEl('div', { cls: 'bunny-eye-toggle clickable-icon' });`,
            output: `${OBSIDIAN}declare const text: { inputEl: HTMLInputElement };\nconst eyeIcon = text.inputEl.parentElement?.createDiv({ cls: 'bunny-eye-toggle clickable-icon' });`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "this.el?.createEl('div', opts) as a statement keeps the optional chain",
            code: `${OBSIDIAN}class View { el: HTMLElement | null = null; render() { this.el?.createEl('div', { cls: 'empty', text: 'None' }); } }`,
            output: `${OBSIDIAN}class View { el: HTMLElement | null = null; render() { this.el?.createDiv({ cls: 'empty', text: 'None' }); } }`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // `view?.el` is typed `HTMLElement | undefined` inside the chain, which
        // has no createDiv() of its own: reported with no fix before.
        {
            name: "an element reached through an optional chain is fixed and keeps the chain",
            code: `${OBSIDIAN}declare const view: { contentEl: HTMLElement } | undefined;\nview?.contentEl.createEl('div', { cls: 'empty' });`,
            output: `${OBSIDIAN}declare const view: { contentEl: HTMLElement } | undefined;\nview?.contentEl.createDiv({ cls: 'empty' });`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // TypeScript reports `el.createEl()` on a nullable element (TS18047);
        // `el.createDiv()` reads the same value and gets the same error.
        {
            name: "a nullable element without ?. is fixed with the same receiver",
            code: `${OBSIDIAN}declare const el: HTMLElement | null;\nel.createEl('span');`,
            output: `${OBSIDIAN}declare const el: HTMLElement | null;\nel.createSpan();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "an optional call keeps its ?.",
            code: `${OBSIDIAN}declare const el: HTMLElement;\nel.createEl?.('span');`,
            output: `${OBSIDIAN}declare const el: HTMLElement;\nel.createSpan?.();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        // The arguments cannot be checked one by one.
        {
            name: "a spread argument gets a suggestion",
            code: `${OBSIDIAN}declare const el: HTMLElement;\ndeclare const args: [DomElementInfo];\nel.createEl('div', ...args);`,
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${OBSIDIAN}declare const el: HTMLElement;\ndeclare const args: [DomElementInfo];\nel.createDiv(...args);`,
                        },
                    ],
                },
            ],
        },

        // --- A receiver whose type has no createDiv()/createSpan(): no fix or suggestion ---
        // The fix failed with TS2339 (grub-basket/SP, ankinglin/EasyQuiz).
        {
            name: "a value cast to a type with only createEl() is reported without a fix",
            code: `${OBSIDIAN}const frag = createFragment() as unknown as { createEl: (t: string, o?: { text?: string }) => HTMLElement };\nfrag.createEl('div', { text: 'Stashpad tabs cleaned up:' });`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "a polyfill's createDiv() calling createEl('div') is reported without a fix",
            code: "declare const proto: { createDiv?: (o?: object) => Element };\nproto.createDiv = function (this: Element, o?: object) {\n    return (this as unknown as { createEl: (t: string, o?: unknown) => Element }).createEl('div', o);\n};",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },

        // --- The helper does not take createEl()'s arguments: no fix or suggestion ---
        {
            name: "createSpan() that takes only a class name is not given createEl()'s options",
            code: `${MOCK_CLASS_NAME_HELPERS}\ndeclare const labelEl: HTMLElement;\nlabelEl.createEl('span', { text: 'Label' });`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "createSpan() that takes only a class name is still fixed without arguments",
            code: `${MOCK_CLASS_NAME_HELPERS}\ndeclare const labelEl: HTMLElement;\nconst span = labelEl.createEl('span');`,
            output: `${MOCK_CLASS_NAME_HELPERS}\ndeclare const labelEl: HTMLElement;\nconst span = labelEl.createSpan();`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- createDiv() returns another type than createEl('div') did ---
        // MOCK_OBSIDIAN_DOM's createEl() returns an HTMLElement, its createDiv()
        // an HTMLDivElement, so a variable holding the result would change type.
        {
            name: "a used result of another type gets a suggestion",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement;\nlet child = el.createEl('div');`,
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement;\nlet child = el.createDiv();`,
                        },
                    ],
                },
            ],
        },
        {
            name: "an unused result of another type is fixed",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement;\nel.createEl('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement;\nel.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- A createEl of the file's own ---
        // A project's typings exported createEl() but declared no global
        // createSpan(), so the fix failed with TS2304 (mohamedsaleh0-0/Advanced-Formatting).
        {
            name: "an imported createEl() without a global createSpan() is reported without a fix",
            code: "import { createEl } from './dom';\nconst span = createEl('span', { cls: 'af-footnote-def-marker' });",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        // The global helper exists, but need not do what the file's createEl() does.
        {
            name: "an imported createEl() with a global createSpan() gets a suggestion",
            code: `import { createEl } from './dom';\n${MOCK_OBSIDIAN_DOM}\nconst span = createEl('span', { cls: 'af-footnote-def-marker' });`,
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: `import { createEl } from './dom';\n${MOCK_OBSIDIAN_DOM}\nconst span = createSpan({ cls: 'af-footnote-def-marker' });`,
                        },
                    ],
                },
            ],
        },
        {
            name: "a declared global createEl() without a global createDiv() is reported without a fix",
            code: "declare global { function createEl(tag: string, o?: object): HTMLElement; }\nexport {};\ncreateEl('div', { cls: 'x' });",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
    ],
});
