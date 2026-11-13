import { RuleTester } from "@typescript-eslint/rule-tester";
import { atMinAppVersion } from "./atMinAppVersion.js";
import globals from "globals";
import preferCreateEl from "../lib/rules/preferCreateEl.js";

const ruleTester = atMinAppVersion(new RuleTester(), "1.5.0");

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

// A project that declares only createEl() on Window: each replacement is fixed
// only when Window declares the helper it calls.
const MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY = `
    declare global {
        interface Document {
            win: Window;
        }
        interface Window {
            createEl(tag: string, o?: any): HTMLElement;
        }
        var activeDocument: Document;
        var activeWindow: Window;
    }
    export {};
`;

ruleTester.run("prefer-create-el", preferCreateEl, {
    valid: [
        // --- An implementation of the helpers: the replacement could call itself ---
        {
            name: "a fake element's createSpan() calling this.createEl('span') is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nclass FakeEl { createEl(tag: string, o?: any): HTMLElement { return document.createElement(tag); }\n  createSpan(options?: any) { return this.createEl('span', options); }\n  createDiv(options?: any) { return this.createEl('div', options); } }`,
        },
        {
            name: "a polyfill assigned to window.createDiv is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const window: any;\nwindow.createDiv = (o: any, cb: any) => { const el = window.document.createElement('div'); cb?.(el); return el; };\nglobalThis.createSpan = function () { return document.createElement('span'); } as any;`,
        },
        {
            name: "a shim on Element.prototype.createEl is not reported, nor callbacks inside it",
            code: `${MOCK_OBSIDIAN_DOM}\n(Element.prototype as any).createEl = function (tag: any, o: any) { const el = document.createElement(tag); [1].forEach(() => el.append(document.createElement('span'))); return el; };`,
        },
        {
            name: "an object property createFragment holding an arrow is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nexport const domShim = { createFragment: () => document.createDocumentFragment(), 'createDiv': function () { return document.createElement('div'); } };`,
        },
        {
            name: "a class field and Object.defineProperty named after a helper are not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nclass Shim { createSvg = (tag: 'svg') => document.createElementNS('http://www.w3.org/2000/svg', tag); }\nObject.defineProperty(Node.prototype, 'createDiv', { value(o?: any) { return document.createElement('div'); } });`,
        },
        {
            name: "a variable holding a function named after a helper is not reported",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nconst createSpan = () => activeDocument.createElement('span');`,
        },
        {
            name: "inside a function named createDiv, its own implementation, createElement('div') is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nfunction createDiv(): HTMLDivElement { return document.createElement('div'); }`,
        },
        {
            name: "inside a function expression named createFragment, createDocumentFragment() is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nconst make = function createFragment() { return document.createDocumentFragment(); };`,
        },
        {
            name: "inside a class method named createDiv, createElement('div') is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nclass View { createDiv() { return document.createElement('div'); } }`,
        },
        {
            name: "inside an object method named createDiv, createElement('div') is not reported",
            code: `${MOCK_OBSIDIAN_DOM}\nconst dom = { createDiv() { return document.createElement('div'); } };`,
        },
        {
            name: "activeDocument.createElement(tag) is not reported with Obsidian's own types, where activeWindow.createEl() would not compile",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('p');`,
        },
        {
            name: "activeDocument.createElement('div') is not reported with Obsidian's own types",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('div');`,
        },
        {
            name: "activeDocument.createElement('span') is not reported with Obsidian's own types",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElement('span');`,
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) is not reported with Obsidian's own types",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');`,
        },
        {
            name: "activeDocument.createDocumentFragment() is not reported with Obsidian's own types",
            code: `${MOCK_ACTIVE_WINDOW_PLAIN}\nactiveDocument.createDocumentFragment();`,
        },
        {
            name: "activeDocument without any types is not reported",
            code: "activeDocument.createElement('span');",
        },
        {
            name: "activeDocument.createElement('div') is not reported when Window declares only createEl()",
            code: `${MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY}\nactiveDocument.createElement('div');`,
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) is not reported when Window declares only createEl()",
            code: `${MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY}\nactiveDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');`,
        },
        {
            name: "activeDocument.createDocumentFragment() is not reported when Window declares only createEl()",
            code: `${MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY}\nactiveDocument.createDocumentFragment();`,
        },
        {
            name: "doc.createElement is not reported when the document's win does not declare the helpers",
            code: `declare const doc: Document;\ndoc.createElement('p');`,
        },
        {
            name: "a nullable document whose win does not declare the helpers is not reported",
            code: `declare const doc: Document | null;\ndoc?.createElement('p');`,
        },
        {
            name: "a node's ownerDocument is not reported with Obsidian's own types, where Window has no DOM helpers",
            code: `import "obsidian";\ndeclare const node: Node;\nnode.ownerDocument?.createElement('p');`,
        },
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
            code: "createEl('section', { cls: 'x' });",
        },
        {
            name: "a bare call to another function with a div or span tag is not flagged",
            code: "createSpan('div'); createSvg('span'); render('div');",
        },
        {
            name: "createDocumentFragment() with an argument is not flagged",
            code: "document.createDocumentFragment(1 as never);",
        },
        {
            name: "an object with only some of a document's members is not flagged",
            code: [
                "declare const noView: { createElement(tag: string): HTMLElement; createElementNS(ns: string, tag: string): Element; createDocumentFragment(): DocumentFragment };",
                "declare const noNamespaces: { defaultView: Window; createElement(tag: string): HTMLElement; createDocumentFragment(): DocumentFragment };",
                "declare const noFragments: { defaultView: Window; createElement(tag: string): HTMLElement; createElementNS(ns: string, tag: string): Element };",
                "noView.createElement('p'); noNamespaces.createElement('p'); noFragments.createElement('p');",
            ].join("\n"),
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
        {
            name: "iframe['contentDocument'] is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\niframe["contentDocument"]!.createElement('style');`,
        },
        {
            name: "a const holding an optional chain to contentDocument is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement | undefined;\nconst doc = iframe?.contentDocument;\ndoc?.createElement('style');`,
        },
        {
            name: "an iframe document behind <Document> or satisfies is not flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\n(<Document>iframe.contentDocument).createElement('style');\n(iframe.contentDocument! satisfies Document).createElementNS('http://www.w3.org/2000/svg', 'path');`,
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
            name: "an imported createSvg leaves createElementNS() without a fix",
            code: `import { createSvg } from './svg';\n${MOCK_OBSIDIAN_DOM}\ndocument.createElementNS('http://www.w3.org/2000/svg', 'path');`,
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        // An ambient declaration has no body: the call still reaches the global.
        {
            name: "an ambient declare function createDiv does not stop the fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare function createDiv(o?: any): HTMLDivElement;\ndocument.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare function createDiv(o?: any): HTMLDivElement;\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "an ambient declare const createDiv does not stop the fix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const createDiv: (o?: any) => HTMLDivElement;\ndocument.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const createDiv: (o?: any) => HTMLDivElement;\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "an optional bare createEl?.('div') is not fixed to a createDiv bound locally",
            code: `${MOCK_OBSIDIAN_DOM}\nexport function make(createDiv: () => HTMLDivElement) { createEl?.('div'); }`,
            output: null,
            errors: [{ messageId: "preferCreateEl", data: { replacement: "createDiv?.()", original: "createEl?.('div')" }, suggestions: [] }],
        },
        {
            name: "a function named otherwise than a helper is still fixed",
            code: `${MOCK_OBSIDIAN_DOM}\nclass View { makeDiv() { return document.createElement('div'); } }\nconst o = { createDivider: () => document.createElement('hr') };`,
            output: `${MOCK_OBSIDIAN_DOM}\nclass View { makeDiv() { return createDiv(); } }\nconst o = { createDivider: () => createEl('hr') };`,
            errors: [{ messageId: "preferCreateEl" }, { messageId: "preferCreateEl" }],
        },
        {
            name: "a prefixed replacement is fixed even when the bare name is bound locally",
            code: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nfunction make(createDiv: unknown) { return activeDocument.createElement('div'); }`,
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nfunction make(createDiv: unknown) { return activeWindow.createDiv(); }`,
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
            errors: [
                {
                    messageId: "preferCreateEl",
                    data: {
                        replacement: "createSvg('path', { is: 'x-path' })",
                        original: "document.createElementNS('http://www.w3.org/2000/svg', 'path', { is: 'x-path' })",
                    },
                    suggestions: [],
                },
            ],
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
        // Window declares createEl() only.
        {
            name: "activeDocument.createElement('p') is fixed when Window declares createEl()",
            code: `${MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY}\nactiveDocument.createElement('p');`,
            output: `${MOCK_ACTIVE_WINDOW_CREATE_EL_ONLY}\nactiveWindow.createEl('p');`,
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
            name: "complex Document expression is parenthesized in autofix",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const cond: boolean;\ndeclare const a: Document & { win: typeof globalThis };\ndeclare const b: Document & { win: typeof globalThis };\n(cond ? a : b).createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const cond: boolean;\ndeclare const a: Document & { win: typeof globalThis };\ndeclare const b: Document & { win: typeof globalThis };\n(cond ? a : b).win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a document in a call's arguments does not take the call's parentheses for its own",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndeclare function append(el: HTMLElement): void;\nappend(doc.createElement('p'));`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndeclare function append(el: HTMLElement): void;\nappend(doc.win.createEl('p'));`,
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
        {
            name: "the document of a window that is not an iframe's contentWindow is still flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const view: { win: { document: Document } };\nview.win.document.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const view: { win: { document: Document } };\nview.win.document.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "another property destructured next to contentDocument is still flagged",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst { contentDocument, ownerDocument } = iframe;\nownerDocument.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\ndeclare const iframe: HTMLIFrameElement;\nconst { contentDocument, ownerDocument } = iframe;\nownerDocument.win.createEl('p');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a const initialised with itself does not loop in the iframe check",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\nconst doc: Document = doc;\ndoc.createElement('p');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare global { interface Document { win: typeof globalThis } }\nconst doc: Document = doc;\ndoc.win.createEl('p');`,
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
    valid: [
        {
            name: "a polyfill's createDiv() calling createEl('div') is not reported",
            code: "declare const proto: { createDiv?: (o?: object) => Element };\nproto.createDiv = function (this: Element, o?: object) {\n    return (this as unknown as { createEl: (t: string, o?: unknown) => Element }).createEl('div', o);\n};",
        },
    ],
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
        {
            name: "document.createEl('div') without a global createDiv() is reported without a fix",
            code: "declare global { interface Document { createEl(tag: string): HTMLElement; } }\nexport {};\ndocument.createEl('div');",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        // document.createEl() is Obsidian's, whatever createEl the file binds.
        {
            name: "document.createEl('div') is fixed when the file imports a createEl of its own",
            code: `import { createEl } from './dom';\n${MOCK_OBSIDIAN_DOM}\ndocument.createEl('div');`,
            output: `import { createEl } from './dom';\n${MOCK_OBSIDIAN_DOM}\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },

        // --- Whether the helper's signature takes createEl()'s arguments ---
        {
            name: "an unused result in an optional chain is fixed",
            code: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement | null;\nel?.createEl('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement | null;\nel?.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a used result of a structurally equal type is fixed",
            code: "declare const el: { createEl(tag: string): { id: number }; createDiv(): { id: number } };\nconst child = el.createEl('div');",
            output: "declare const el: { createEl(tag: string): { id: number }; createDiv(): { id: number } };\nconst child = el.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a helper whose parameter has a default value is fixed",
            code: "class Box { createEl(tag: string) { return tag; } createSpan(cls = '') { return cls; } }\ndeclare const box: Box;\nbox.createEl('span');",
            output: "class Box { createEl(tag: string) { return tag; } createSpan(cls = '') { return cls; } }\ndeclare const box: Box;\nbox.createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a helper with a required parameter that createEl() does not pass gets neither a fix nor a suggestion",
            code: "declare const el: { createEl(tag: string): HTMLElement; createSpan(cls: string): HTMLElement };\nel.createEl('span');",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        {
            name: "more arguments than the helper takes get neither a fix nor a suggestion",
            code: "declare const el: { createEl(tag: string, cls?: string, title?: string): HTMLElement; createSpan(cls?: string): HTMLElement };\nel.createEl('span', 'a', 'b');",
            output: null,
            errors: [{ messageId: "preferCreateEl", suggestions: [] }],
        },
        // The arguments are not checked against a generic or rest parameter.
        {
            name: "a generic helper gets a suggestion",
            code: "declare const el: { createEl(tag: string, o?: object): HTMLElement; createSpan<T extends object>(o?: T): HTMLElement };\nel.createEl('span', { text: 'x' });",
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "declare const el: { createEl(tag: string, o?: object): HTMLElement; createSpan<T extends object>(o?: T): HTMLElement };\nel.createSpan({ text: 'x' });",
                        },
                    ],
                },
            ],
        },
        {
            name: "a helper with a rest parameter gets a suggestion",
            code: "declare const el: { createEl(tag: string, ...classes: string[]): HTMLElement; createSpan(...classes: string[]): HTMLElement };\nel.createEl('span', 'a', 'b');",
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [
                        {
                            messageId: "preferCreateElSuggestion",
                            output: "declare const el: { createEl(tag: string, ...classes: string[]): HTMLElement; createSpan(...classes: string[]): HTMLElement };\nel.createSpan('a', 'b');",
                        },
                    ],
                },
            ],
        },
    ],
});

// Without strictNullChecks an unknown receiver stays unknown, which the types
// cannot tell anything about: fixed, like an any receiver.
const nonStrictRuleTester = atMinAppVersion(new RuleTester({
    languageOptions: { parserOptions: { project: "./tests/fixtures/tsconfig.non-strict.json" } },
}), "1.5.0");

nonStrictRuleTester.run("prefer-create-el without strictNullChecks", preferCreateEl, {
    valid: [],
    invalid: [
        {
            name: "an unknown receiver is fixed like an any one",
            code: "declare const el: unknown;\nel.createEl('div');",
            output: "declare const el: unknown;\nel.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
    ],
});

// The recommended config declares the browser's and Obsidian's globals. They
// are variables without a declaration in the file: still the globals.
const globalsRuleTester = atMinAppVersion(new RuleTester({
    languageOptions: {
        globals: {
            ...globals.browser,
            activeDocument: "readonly",
            activeWindow: "readonly",
            createDiv: "readonly",
            createEl: "readonly",
            createFragment: "readonly",
            createSpan: "readonly",
            createSvg: "readonly",
        },
    },
}), "1.5.0");

globalsRuleTester.run("prefer-create-el with the recommended config's globals", preferCreateEl, {
    valid: [],
    invalid: [
        {
            name: "document.createElement('div') → createDiv()",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('div');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('span') → createSpan()",
            code: `${MOCK_OBSIDIAN_DOM}\ncreateEl('span');`,
            output: `${MOCK_OBSIDIAN_DOM}\ncreateSpan();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
    ],
});

// Replacements that need a newer Obsidian than the plugin's minAppVersion are
// not offered: createDiv() and createSpan() 0.10.0, createFragment() 0.9.11, createSvg() 1.1.0, activeWindow 0.15.0, `doc.win` 0.15.3. The
// native call is right on older versions, so it is not reported either.
const versionRuleTester = new RuleTester();
const at = (minAppVersion: string): [{ minAppVersion: string }] => [{ minAppVersion }];
const SVG = `${MOCK_OBSIDIAN_DOM}\ndocument.createElementNS('http://www.w3.org/2000/svg', 'path');`;
const ACTIVE = `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveDocument.createElement('div');`;
const DOC_WIN = `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.createElement('div');`;

versionRuleTester.run("prefer-create-el and minAppVersion", preferCreateEl, {
    valid: [
        { name: "createSvg() below 1.1.0 is not reported", code: SVG, options: at("1.0.9") },
        { name: "createDiv() below 0.10.0 is not reported", code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('div');`, options: at("0.9.21") },
        { name: "el.createDiv() below 0.10.0 is not reported", code: `${MOCK_OBSIDIAN_DOM}\ndeclare const el: HTMLElement;\nel.createEl('div');`, options: at("0.9.21") },
        { name: "createFragment() below 0.9.11 is not reported", code: `${MOCK_OBSIDIAN_DOM}\ndocument.createDocumentFragment();`, options: at("0.9.8") },
        { name: "activeWindow below 0.15.0 is not reported", code: ACTIVE, options: at("0.14.9") },
        { name: "doc.win below 0.15.3 is not reported", code: DOC_WIN, options: at("0.15.2") },
        { name: "doc.win at 0.15.0, from the repository's manifest.json, is not reported", code: DOC_WIN },
    ],
    invalid: [
        {
            name: "createSvg() at 1.1.0 is fixed",
            code: SVG,
            options: at("1.1.0"),
            output: `${MOCK_OBSIDIAN_DOM}\ncreateSvg('path');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createSvg() with an unknown version is fixed as before",
            code: SVG,
            options: at("latest"),
            output: `${MOCK_OBSIDIAN_DOM}\ncreateSvg('path');`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeWindow at 0.15.0 is fixed",
            code: ACTIVE,
            options: at("0.15.0"),
            output: `${MOCK_ACTIVE_WINDOW_WITH_HELPERS}\nactiveWindow.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "doc.win at 0.15.3 is fixed",
            code: DOC_WIN,
            options: at("0.15.3"),
            output: `${MOCK_OBSIDIAN_DOM}\ndeclare const doc: Document & { win: typeof globalThis };\ndoc.win.createDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElement('div') → createDiv() at 0.10.0 is fixed",
            code: `${MOCK_OBSIDIAN_DOM}\ndocument.createElement('div');`,
            options: at("0.10.0"),
            output: `${MOCK_OBSIDIAN_DOM}\ncreateDiv();`,
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "a suggested createSvg() says which version it needs when none is known",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
            options: at("latest"),
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [{ messageId: "preferCreateElSuggestionSince", data: { since: "1.1.0", original: "document.createElementNS('http://www.w3.org/2000/svg', 'path')", replacement: "createSvg('path')" }, output: "createSvg('path');" }],
                },
            ],
        },
        {
            name: "a suggested createSvg() at 1.1.0 does not mention a version",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
            options: at("1.1.0"),
            output: null,
            errors: [
                {
                    messageId: "preferCreateEl",
                    suggestions: [{ messageId: "preferCreateElSuggestion", output: "createSvg('path');" }],
                },
            ],
        },
    ],
});
