import { RuleTester } from "@typescript-eslint/rule-tester";
import { atMinAppVersion } from "./atMinAppVersion.js";
import preferInstanceofRule from "../lib/rules/preferInstanceof.js";

const ruleTester = atMinAppVersion(new RuleTester(), "1.5.0");

// Obsidian's declarations of instanceOf() on the DOM's own Node and UIEvent,
// from TypeScript's lib.dom.d.ts. Only those are reported: a class of the
// same name declared elsewhere, such as React's UIEvent, is not.
const MOCK_DOM = `
    declare global {
        interface Node {
            instanceOf<T>(type: { new(): T }): this is T;
        }
        interface UIEvent {
            instanceOf<T>(type: { new(...data: any[]): T }): this is T;
        }
    }
    export {};
`;

// The DOM types WITHOUT the instanceOf method: lib.dom.d.ts without Obsidian's typings.
const MOCK_DOM_NO_INSTANCEOF = `
    export {};
`;

ruleTester.run("prefer-instanceof", preferInstanceofRule, {
    valid: [
        {
            name: "instanceOf method call is allowed",
            code: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
            `,
        },
        {
            name: "instanceof on non-Node non-UIEvent class is allowed",
            code: `
                class Foo {}
                declare const x: Foo;
                if (x instanceof Foo) {}
            `,
        },
        {
            name: "instanceof on plain object is allowed",
            code: `
                class MyPlugin {}
                declare const p: MyPlugin;
                if (p instanceof MyPlugin) {}
            `,
        },
        {
            name: "instanceof on a generic class that is not a Node is allowed",
            code: `
                ${MOCK_DOM}
                class Box<T> { value?: T }
                class NamedBox extends Box<string> {}
                declare const box: NamedBox;
                if (box instanceof NamedBox) {}
            `,
        },
        {
            name: "instanceof on an any value is not reported",
            code: `
                ${MOCK_DOM}
                declare const value: any;
                if (value instanceof HTMLElement) {}
            `,
        },
    ],
    invalid: [
        {
            name: "instanceof on an instance of a generic Node class is fixed",
            code: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement { data?: T }
                declare const el: DataEl<string>;
                if (el instanceof HTMLDivElement) {}
            `,
            output: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement { data?: T }
                declare const el: DataEl<string>;
                if (el.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "instanceof on a class whose base class is a generic Node class is fixed",
            code: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement { data?: T }
                class CountEl extends DataEl<number> {}
                declare const el: CountEl;
                if (el instanceof HTMLDivElement) {}
            `,
            output: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement { data?: T }
                class CountEl extends DataEl<number> {}
                declare const el: CountEl;
                if (el.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "instanceof on an instance of a generic UIEvent class is fixed",
            code: `
                ${MOCK_DOM}
                class PayloadEvent<T> extends UIEvent { payload?: T }
                declare const evt: PayloadEvent<string>;
                if (evt instanceof MouseEvent) {}
            `,
            output: `
                ${MOCK_DOM}
                class PayloadEvent<T> extends UIEvent { payload?: T }
                declare const evt: PayloadEvent<string>;
                if (evt.instanceOf(MouseEvent)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "MouseEvent" } }],
        },
        {
            name: "this inside a generic Node class is fixed",
            code: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement {
                    data?: T;
                    isDiv() { return this instanceof HTMLDivElement; }
                }
            `,
            output: `
                ${MOCK_DOM}
                class DataEl<T> extends HTMLElement {
                    data?: T;
                    isDiv() { return this.instanceOf(HTMLDivElement); }
                }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "a generic Node class without the instanceOf method gets a suggestion, not a fix",
            code: `
                ${MOCK_DOM_NO_INSTANCEOF}
                class DataEl<T> extends HTMLElement { data?: T }
                declare const el: DataEl<string>;
                if (el instanceof HTMLElement) {}
            `,
            output: null,
            errors: [{
                messageId: "preferInstanceof",
                data: { className: "HTMLElement" },
                suggestions: [{
                    messageId: "preferInstanceofSuggestion",
                    data: { className: "HTMLElement" },
                    output: `
                ${MOCK_DOM_NO_INSTANCEOF}
                class DataEl<T> extends HTMLElement { data?: T }
                declare const el: DataEl<string>;
                if (el.instanceOf(HTMLElement)) {}
            `,
                }],
            }],
        },
        {
            name: "instanceof on Node is forbidden",
            code: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "instanceof on HTMLElement subclass is forbidden",
            code: `
                ${MOCK_DOM}
                declare const el: HTMLDivElement;
                if (el instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const el: HTMLDivElement;
                if (el.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "instanceof on UIEvent is forbidden",
            code: `
                ${MOCK_DOM}
                declare const evt: UIEvent;
                if (evt instanceof MouseEvent) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const evt: UIEvent;
                if (evt.instanceOf(MouseEvent)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "MouseEvent" } }],
        },
        {
            name: "instanceof on MouseEvent subclass is forbidden",
            code: `
                ${MOCK_DOM}
                declare const evt: MouseEvent;
                if (evt instanceof KeyboardEvent) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const evt: MouseEvent;
                if (evt.instanceOf(KeyboardEvent)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "KeyboardEvent" } }],
        },
        {
            name: "instanceof on Element is forbidden",
            code: `
                ${MOCK_DOM}
                declare const el: Element;
                if (el instanceof HTMLDivElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const el: Element;
                if (el.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "the fix keeps the parentheses around an awaited value",
            code: `
                ${MOCK_DOM}
                declare function getEl(): Promise<Node>;
                async function f() { if ((await getEl()) instanceof HTMLElement) {} }
            `,
            output: `
                ${MOCK_DOM}
                declare function getEl(): Promise<Node>;
                async function f() { if ((await getEl()).instanceOf(HTMLElement)) {} }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "the fix keeps the parentheses around a type assertion",
            code: `
                ${MOCK_DOM}
                declare const a: unknown;
                if ((a as Node) instanceof Element) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const a: unknown;
                if ((a as Node).instanceOf(Element)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "Element" } }],
        },
        {
            name: "the fix keeps the parentheses around a conditional",
            code: `
                ${MOCK_DOM}
                declare const c: boolean; declare const x: HTMLElement; declare const y: HTMLElement;
                if ((c ? x : y) instanceof HTMLDivElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const c: boolean; declare const x: HTMLElement; declare const y: HTMLElement;
                if ((c ? x : y).instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "the fix parenthesizes an unparenthesized await",
            code: `
                ${MOCK_DOM}
                declare function getEl(): Promise<Node>;
                async function f() { return await getEl() instanceof HTMLElement; }
            `,
            output: `
                ${MOCK_DOM}
                declare function getEl(): Promise<Node>;
                async function f() { return (await getEl()).instanceOf(HTMLElement); }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "the fix does not parenthesize a member chain",
            code: `
                ${MOCK_DOM}
                declare const view: { containerEl: { firstChild: Node } };
                if (view.containerEl.firstChild instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const view: { containerEl: { firstChild: Node } };
                if (view.containerEl.firstChild.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "the fix does not parenthesize a call or a non-null assertion",
            code: `
                ${MOCK_DOM}
                declare function getEl(): Node; declare const maybe: Node | null;
                if (getEl() instanceof HTMLElement || maybe! instanceof Element) {}
            `,
            output: `
                ${MOCK_DOM}
                declare function getEl(): Node; declare const maybe: Node | null;
                if (getEl().instanceOf(HTMLElement) || maybe!.instanceOf(Element)) {}
            `,
            errors: [
                { messageId: "preferInstanceof", data: { className: "HTMLElement" } },
                { messageId: "preferInstanceof", data: { className: "Element" } },
            ],
        },
        {
            name: "the fix does not parenthesize this",
            code: `
                ${MOCK_DOM}
                class MyEl extends HTMLElement { isDiv() { return this instanceof HTMLDivElement; } }
            `,
            output: `
                ${MOCK_DOM}
                class MyEl extends HTMLElement { isDiv() { return this.instanceOf(HTMLDivElement); } }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "the fix drops redundant parentheses around an identifier",
            code: `
                ${MOCK_DOM}
                declare const el: Node;
                if ((el) instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "the fix keeps a sequence on the right as one argument",
            code: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el instanceof (0, HTMLElement)) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const el: Node;
                if (el.instanceOf((0, HTMLElement))) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "(0, HTMLElement)" } }],
        },
        {
            name: "the suggestion keeps the parentheses around an awaited value",
            code: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare function getEl(): Promise<Node>;
                async function f() { if ((await getEl()) instanceof HTMLElement) {} }
            `,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare function getEl(): Promise<Node>;
                async function f() { if ((await getEl()).instanceOf(HTMLElement)) {} }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "instanceof on Node without instanceOf method offers suggestion instead of autofix",
            code: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const el: Node;
                if (el instanceof HTMLElement) {}
            `,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "instanceof on UIEvent without instanceOf method offers suggestion instead of autofix",
            code: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const evt: UIEvent;
                if (evt instanceof MouseEvent) {}
            `,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "MouseEvent" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofSuggestion",
                            data: { className: "MouseEvent" },
                            output: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const evt: UIEvent;
                if (evt.instanceOf(MouseEvent)) {}
            `,
                        },
                    ],
                },
            ],
        },

        // --- A value that may be undefined: `?.instanceOf()` as a suggestion ---
        // `undefined instanceof HTMLElement` is false, `undefined.instanceOf()`
        // throws. Without noUncheckedIndexedAccess an index is typed as an
        // element even past the end of the list.
        {
            name: "an array element gets a suggestion with ?.",
            code: `
                ${MOCK_DOM}
                declare const list: Node[];
                if (list[0] instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM}
                declare const list: Node[];
                if (list[0]?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an array element at a computed index gets a suggestion with ?.",
            code: `
                ${MOCK_DOM}
                declare const list: Node[]; declare const i: number;
                if (list[i] instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM}
                declare const list: Node[]; declare const i: number;
                if (list[i]?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a record entry read with a dot gets a suggestion with ?.",
            code: `
                ${MOCK_DOM}
                declare const els: Record<string, Node>;
                if (els.main instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM}
                declare const els: Record<string, Node>;
                if (els.main?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an array element without instanceOf types gets a suggestion with ?.",
            code: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const list: Node[];
                if (list[0] instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLElement" },
                            output: `
                ${MOCK_DOM_NO_INSTANCEOF}
                declare const list: Node[];
                if (list[0]?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a tuple element is fixed",
            code: `
                ${MOCK_DOM}
                declare const pair: [Node, Node];
                if (pair[1] instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const pair: [Node, Node];
                if (pair[1].instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "a declared property read with brackets is fixed",
            code: `
                ${MOCK_DOM}
                declare const view: { containerEl: Node };
                if (view["containerEl"] instanceof HTMLElement) {}
            `,
            output: `
                ${MOCK_DOM}
                declare const view: { containerEl: Node };
                if (view["containerEl"].instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
    ],
});

// Obsidian's declarations of instanceOf() on the DOM's own Node and UIEvent.
const OBSIDIAN_INSTANCEOF = `
    declare global {
        interface Node {
            instanceOf<T>(type: { new (): T }): this is T;
        }
        interface UIEvent {
            instanceOf<T>(type: { new (...data: any[]): T }): this is T;
        }
    }
    export {};
`;

// With strictNullChecks a value that may be null or undefined has a union type,
// which has no symbol or base types of its own: these were never reported.
ruleTester.run("prefer-instanceof with strictNullChecks", preferInstanceofRule, {
    valid: [
        {
            name: "a nullable value of another class is not reported",
            code: `
                class TFile {}
                declare const file: TFile | null;
                if (file instanceof TFile) {}
            `,
        },
        {
            name: "a value that may be a Node or a string is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const value: Node | string | undefined;
                if (value instanceof HTMLElement) {}
            `,
        },
        {
            name: "a value that may be a Node or another class is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                class Widget {}
                declare const value: Node | Widget | undefined;
                declare const other: Node | Widget;
                if (value instanceof HTMLElement || other instanceof HTMLElement) {}
            `,
        },
        {
            name: "a nullable unknown value is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const value: unknown;
                if (value instanceof HTMLElement) {}
            `,
        },
        {
            name: "a type parameter constrained to a nullable object is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                function isEl<T extends object | null>(value: T) { return value instanceof HTMLElement; }
            `,
        },
    ],
    invalid: [
        {
            name: "a nullable property gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLDivElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLDivElement" },
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a Node that may be undefined gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node | undefined;
                if (node instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node | undefined;
                if (node?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a Node that may be void gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node | void;
                if (node instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node | void;
                if (node?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an event that may be null gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const evt: UIEvent | null;
                if (evt instanceof MouseEvent) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const evt: UIEvent | null;
                if (evt?.instanceOf(MouseEvent)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a type parameter constrained to a nullable element gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                function isDiv<T extends HTMLElement | null>(el: T) { return el instanceof HTMLDivElement; }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                function isDiv<T extends HTMLElement | null>(el: T) { return el?.instanceOf(HTMLDivElement); }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a type parameter that may be null gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                function isDiv<T extends HTMLElement>(el: T | null) { return el instanceof HTMLDivElement; }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                function isDiv<T extends HTMLElement>(el: T | null) { return el?.instanceOf(HTMLDivElement); }
            `,
                        },
                    ],
                },
            ],
        },
        // Nothing in the declarations says null: only the type does.
        {
            name: "a value inferred as nullable gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const cond: boolean;
                const target = cond ? el : null;
                if (target instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const cond: boolean;
                const target = cond ? el : null;
                if (target?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an optional chain gets a suggestion that continues it",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if (view?.containerEl instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if (view?.containerEl?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },

        // --- Narrowed or asserted to a non-null value: still fixed ---
        // `?.` on a value that cannot be null adds no undefined: the chain is
        // wrapped, as `view?.containerEl.instanceOf()` would read differently.
        {
            name: "an optional chain that cannot be undefined is fixed and wrapped",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement };
                if (view?.containerEl instanceof HTMLDivElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement };
                if ((view?.containerEl).instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "a nullable property narrowed by a check is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const parent = el.parentElement;
                if (parent && parent instanceof HTMLDivElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const parent = el.parentElement;
                if (parent && parent.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "a non-null assertion on a nullable value is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement! instanceof HTMLDivElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement!.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
    ],
});

// Without strictNullChecks no type includes null, so `Element | null` reads as
// `Element`. Whether a value may be null comes from its declaration then.
const nonStrictRuleTester = atMinAppVersion(new RuleTester({
    languageOptions: { parserOptions: { project: "./tests/fixtures/tsconfig.non-strict.json" } },
}), "1.5.0");

nonStrictRuleTester.run("prefer-instanceof without strictNullChecks", preferInstanceofRule, {
    valid: [],
    invalid: [
        // `firstElementChild` is declared `Element | null`; the fix to
        // `firstChild.instanceOf()` failed with TS18047 under strict mode and
        // throws for a button without children.
        {
            name: "a const holding a nullable property gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const btn: HTMLElement;
                const firstChild = btn.firstElementChild;
                if (firstChild instanceof HTMLElement && firstChild.offsetWidth < 10) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    data: { className: "HTMLElement" },
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            data: { className: "HTMLElement" },
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const btn: HTMLElement;
                const firstChild = btn.firstElementChild;
                if (firstChild?.instanceOf(HTMLElement) && firstChild.offsetWidth < 10) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a nullable property gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a call that may return null gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.querySelector(".name") instanceof HTMLInputElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.querySelector(".name")?.instanceOf(HTMLInputElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an optional parameter gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                function isDiv(el?: Node) { return el instanceof HTMLDivElement; }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                function isDiv(el?: Node) { return el?.instanceOf(HTMLDivElement); }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a value typed with a nullable alias gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                type MaybeNode = Node | undefined;
                declare const node: MaybeNode;
                if (node instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                type MaybeNode = Node | undefined;
                declare const node: MaybeNode;
                if (node?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an optional chain gets a suggestion that continues it",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if (view?.containerEl instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if (view?.containerEl?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },

        {
            name: "a nullable property read through parentheses or satisfies gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const a = (el.parentElement);
                const b = el.parentElement satisfies Element | null;
                if (a instanceof HTMLDivElement || b instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const a = (el.parentElement);
                const b = el.parentElement satisfies Element | null;
                if (a?.instanceOf(HTMLDivElement) || b instanceof HTMLDivElement) {}
            `,
                        },
                    ],
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const a = (el.parentElement);
                const b = el.parentElement satisfies Element | null;
                if (a instanceof HTMLDivElement || b?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a value cast to a nullable type gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstChild as Element | null;
                if (child instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstChild as Element | null;
                if (child?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        // Without noUncheckedIndexedAccess, an index signature hands out
        // undefined past the end, which the element type does not say.
        {
            name: "a const holding an index signature's entry gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const list: Node[]; declare const els: Record<string, Node>;
                const first = list[0];
                const main = els.main;
                if (first instanceof HTMLElement || main instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const list: Node[]; declare const els: Record<string, Node>;
                const first = list[0];
                const main = els.main;
                if (first?.instanceOf(HTMLElement) || main instanceof HTMLElement) {}
            `,
                        },
                    ],
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const list: Node[]; declare const els: Record<string, Node>;
                const first = list[0];
                const main = els.main;
                if (first instanceof HTMLElement || main?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a const holding a nullable property read with brackets gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { parentEl: Node | null };
                const parent = view["parentEl"];
                if (parent instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { parentEl: Node | null };
                const parent = view["parentEl"];
                if (parent?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a conditional with a nullable branch gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const cond: boolean;
                const a = cond ? el.parentElement : el;
                const b = cond ? el : el.parentElement;
                if (a instanceof HTMLDivElement || b instanceof HTMLDivElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const cond: boolean;
                const a = cond ? el.parentElement : el;
                const b = cond ? el : el.parentElement;
                if (a?.instanceOf(HTMLDivElement) || b instanceof HTMLDivElement) {}
            `,
                        },
                    ],
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const cond: boolean;
                const a = cond ? el.parentElement : el;
                const b = cond ? el : el.parentElement;
                if (a instanceof HTMLDivElement || b?.instanceOf(HTMLDivElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        // `a && b` is `a` when `a` is falsy; `a || b`, `a ?? b`, `(a, b)` and
        // `(a = b)` can be `b`.
        ...[
            ["&& with a nullable left", "el.parentElement && el"],
            ["|| with a nullable right", "fallback || el.parentElement"],
            ["?? with a nullable right", "fallback ?? el.parentElement"],
            ["a comma with a nullable right", "(0, el.parentElement)"],
            ["an assignment of a nullable value", "(other = el.parentElement)"],
        ].map(([form, init]) => {
            const code = (check: string) => `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement; declare const fallback: HTMLElement; let other: HTMLElement;
                const value = ${init};
                if (${check}) {}
            `;
            return {
                name: `a const holding ${form} gets a suggestion with ?.`,
                code: code("value instanceof HTMLDivElement"),
                output: null,
                errors: [
                    {
                        messageId: "preferInstanceof" as const,
                        suggestions: [
                            {
                                messageId: "preferInstanceofOptionalSuggestion" as const,
                                output: code("value?.instanceOf(HTMLDivElement)"),
                            },
                        ],
                    },
                ],
            };
        }),
        {
            name: "a parameter declared nullable gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                function isDiv(el: Node | null) { return el instanceof HTMLDivElement; }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                function isDiv(el: Node | null) { return el?.instanceOf(HTMLDivElement); }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a value typed with a parenthesized nullable type gets a suggestion with ?.",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: (Node | null);
                if (node instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `${OBSIDIAN_INSTANCEOF}
                declare const node: (Node | null);
                if (node?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "an imported value or type declared nullable in another module gets a suggestion with ?.",
            code: `import { maybeNode, type MaybeNode } from "./tests/fixtures/nullableNode.js";
                ${OBSIDIAN_INSTANCEOF}
                declare const node: MaybeNode;
                if (maybeNode instanceof HTMLElement || node instanceof HTMLElement) {}
            `,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `import { maybeNode, type MaybeNode } from "./tests/fixtures/nullableNode.js";
                ${OBSIDIAN_INSTANCEOF}
                declare const node: MaybeNode;
                if (maybeNode?.instanceOf(HTMLElement) || node instanceof HTMLElement) {}
            `,
                        },
                    ],
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestion",
                            output: `import { maybeNode, type MaybeNode } from "./tests/fixtures/nullableNode.js";
                ${OBSIDIAN_INSTANCEOF}
                declare const node: MaybeNode;
                if (maybeNode instanceof HTMLElement || node?.instanceOf(HTMLElement)) {}
            `,
                        },
                    ],
                },
            ],
        },
        // An optional property, a class field, a parameter property and a getter.
        ...[
            ["an optional property", "declare const view: { el?: Node };", "view.el"],
            ["a nullable class field", "declare class View { el: Node | null; }\ndeclare const view: View;", "view.el"],
            ["a nullable parameter property", "class View { constructor(public el: Node | null) {} }\ndeclare const view: View;", "view.el"],
            ["a nullable getter", "declare class View { get el(): Node | null; }\ndeclare const view: View;", "view.el"],
        ].map(([form, declarations, left]) => {
            const code = (check: string) => `${OBSIDIAN_INSTANCEOF}
                ${declarations}
                if (${check}) {}
            `;
            return {
                name: `${form} gets a suggestion with ?.`,
                code: code(`${left} instanceof HTMLElement`),
                output: null,
                errors: [
                    {
                        messageId: "preferInstanceof" as const,
                        suggestions: [
                            {
                                messageId: "preferInstanceofOptionalSuggestion" as const,
                                output: code(`${left}?.instanceOf(HTMLElement)`),
                            },
                        ],
                    },
                ],
            };
        }),

        // --- A cast that leaves out null: the value may still be null ---
        {
            name: "a value cast from one declared nullable to a type without null gets the ?. suggestion",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstElementChild as Element;
                if (child instanceof HTMLElement) {}
            `,
            errors: [{
                messageId: "preferInstanceof",
                data: { className: "HTMLElement" },
                suggestions: [{
                    messageId: "preferInstanceofOptionalSuggestion",
                    data: { className: "HTMLElement" },
                    output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstElementChild as Element;
                if (child?.instanceOf(HTMLElement)) {}
            `,
                }],
            }],
        },

        // --- Declared without null or undefined: still fixed ---
        {
            name: "a value declared as a Node is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el instanceof HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        {
            name: "an event parameter is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                function onClick(evt: UIEvent) { if (evt instanceof MouseEvent) {} }
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                function onClick(evt: UIEvent) { if (evt.instanceOf(MouseEvent)) {} }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "MouseEvent" } }],
        },
        {
            name: "a property declared without null is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement };
                if (view.containerEl instanceof HTMLDivElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement };
                if (view.containerEl.instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
        {
            name: "a non-null assertion on a nullable value is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.firstElementChild! instanceof HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.firstElementChild!.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
        // The `!` is trusted as on any other value; the chain is wrapped.
        {
            name: "a non-null assertion on an optional chain is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if (view?.containerEl! instanceof HTMLDivElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const view: { containerEl: HTMLElement } | undefined;
                if ((view?.containerEl!).instanceOf(HTMLDivElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLDivElement" } }],
        },
    ],
});

// A constructor read from a window of the code's choosing, such as the value's
// own `ownerDocument.defaultView`, is what `.instanceOf()` checks against too.
// Found in the community-plugin run.
ruleTester.run("prefer-instanceof with a constructor from a window object", preferInstanceofRule, {
    valid: [
        {
            name: "the constructor of the element's own window, through defaultView!, is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const focus = el.ownerDocument.activeElement;
                if (focus instanceof el.ownerDocument.defaultView!.HTMLElement) {}
            `,
        },
        {
            name: "the constructor through defaultView?. is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                declare const node: Node;
                if (node instanceof el.ownerDocument.defaultView?.HTMLElement) {}
                if (el.firstChild instanceof el.ownerDocument.defaultView!.Text) {}
            `,
        },
        {
            name: "the constructor of a window held in a variable is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const win: Window;
                declare const evt: UIEvent;
                if (evt instanceof win.MouseEvent) {}
            `,
        },
    ],
    invalid: [
        {
            name: "the main window's constructor is still reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node;
                if (node instanceof window.HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node;
                if (node.instanceOf(window.HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "window.HTMLElement" } }],
        },
        {
            name: "the active window's constructor is still reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const activeWindow: Window;
                declare const node: Node;
                if (node instanceof activeWindow.HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const activeWindow: Window;
                declare const node: Node;
                if (node.instanceOf(activeWindow.HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "activeWindow.HTMLElement" } }],
        },
        {
            name: "a constructor from an object that is not a window is still reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const dom: { HTMLElement: typeof HTMLElement };
                declare const node: Node;
                if (node instanceof dom.HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const dom: { HTMLElement: typeof HTMLElement };
                declare const node: Node;
                if (node.instanceOf(dom.HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "dom.HTMLElement" } }],
        },
    ],
});

// I1: a constructor from the node's own window, kept in a const first
// (tile-line-base RenderedLinkNavigation.ts, taskchute-plus registerTaskCommands.ts).
ruleTester.run("prefer-instanceof with a constructor kept in a const", preferInstanceofRule, {
    valid: [
        {
            name: "a const set from the element's own defaultView is followed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                declare const link: Node;
                const HTMLElementCtor = el.ownerDocument.defaultView?.HTMLElement;
                if (HTMLElementCtor && link instanceof HTMLElementCtor) {}
            `,
        },
        {
            name: "a const set from a window's constructor ?? the main one is followed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node;
                declare const doc: Document;
                const Ctor = doc.defaultView?.HTMLElement ?? HTMLElement;
                if (node instanceof Ctor) {}
                if (node instanceof (doc.defaultView?.HTMLElement || HTMLElement)) {}
            `,
        },
        {
            name: "a const set from another const is followed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                declare const node: Node;
                const win = el.ownerDocument.defaultView!;
                const Ctor = win.HTMLElement;
                const Same = Ctor;
                if (node instanceof Same) {}
            `,
        },
    ],
    invalid: [
        {
            name: "a const set from the main window's constructor is still reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node;
                const Ctor = window.HTMLElement;
                if (node instanceof Ctor) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const node: Node;
                const Ctor = window.HTMLElement;
                if (node.instanceOf(Ctor)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "Ctor" } }],
        },
        {
            name: "a let is not followed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                declare const node: Node;
                let Ctor = el.ownerDocument.defaultView!.HTMLElement;
                if (node instanceof Ctor) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                declare const node: Node;
                let Ctor = el.ownerDocument.defaultView!.HTMLElement;
                if (node.instanceOf(Ctor)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "Ctor" } }],
        },
    ],
});

// I2: in an instanceOf() polyfill, `this instanceof type` is the check itself,
// and `this.instanceOf(type)` would call the polyfill again, without end
// (rss-dashboard test_files/unit/test-dom-polyfills.ts).
ruleTester.run("prefer-instanceof in an instanceOf() implementation", preferInstanceofRule, {
    valid: [
        {
            name: "a function assigned to Node.prototype.instanceOf is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const scope: { Node: typeof Node };
                scope.Node.prototype.instanceOf = function <T>(this: Node, type: { new (): T }): this is T {
                    if (this instanceof type) return true;
                    return this instanceof HTMLElement && [type].some((t) => this instanceof t);
                };
            `,
        },
        {
            name: "a method named instanceOf is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                class FakeNode {
                    instanceOf(this: Node, type: typeof HTMLElement) { return this instanceof type; }
                }
                const helpers = { instanceOf(node: Node) { return node instanceof HTMLElement; } };
            `,
        },
        {
            name: "a function named instanceOf, or defined as instanceOf, is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                function instanceOf(node: Node, type: typeof HTMLElement) { return node instanceof type; }
                Object.defineProperty(Node.prototype, "instanceOf", {
                    value: function (this: Node, type: typeof HTMLElement) { return this instanceof type; },
                });
            `,
        },
    ],
    invalid: [
        {
            name: "a function of another name is still fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                function isElement(node: Node) { return node instanceof HTMLElement; }
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                function isElement(node: Node) { return node.instanceOf(HTMLElement); }
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
    ],
});

// I3: only the DOM's own Node and UIEvent have instanceOf(). React's synthetic
// UIEvent shares the name (task-board TaskBoardViewContent.tsx:682).
ruleTester.run("prefer-instanceof on types named like the DOM's", preferInstanceofRule, {
    valid: [
        {
            name: "a React synthetic event is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare namespace React {
                    interface SyntheticEvent<T = Element, E = Event> { nativeEvent: E; currentTarget: T; }
                    interface UIEvent<T = Element, E = globalThis.UIEvent> extends SyntheticEvent<T, E> {}
                    interface MouseEvent<T = Element, E = globalThis.MouseEvent> extends UIEvent<T, E> {}
                }
                declare const menu: { showAtMouseEvent(evt: MouseEvent): void };
                export function openMenu(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
                    menu.showAtMouseEvent(event instanceof MouseEvent ? event : event.nativeEvent);
                }
            `,
        },
        {
            name: "a syntax tree Node of another package is not reported",
            code: `${OBSIDIAN_INSTANCEOF}
                declare namespace Unist { interface Node { type: string } interface Parent extends Node { children: Node[] } }
                class TextNode implements Unist.Node { type = "text"; }
                declare const node: Unist.Parent;
                if (node instanceof TextNode) {}
            `,
        },
    ],
    invalid: [],
});

// EventTarget operands: `e.target` is typed EventTarget, but in a handler it
// holds a node of the window the event happened in, so `instanceof` the main
// window's class is false in a popout. Never fixed; suggested only where the
// narrowing of `e.target` is kept. With the obsidian typings, which declare
// UIEvent's targetNode and Node's instanceOf(). Shapes from the
// community-plugin run (sweep051 analysis/eventtarget.tsv).
const obsidianRuleTester = atMinAppVersion(new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/obsidian-project` },
    },
}), "1.5.0");

const eventTargetError = (operand: string, className: string, suggestions: { messageId: "useTargetNode" | "castToNode"; output: string }[] = []) => ({
    messageId: "preferInstanceofOnEventTarget" as const,
    data: { operand, className },
    suggestions,
});

obsidianRuleTester.run("prefer-instanceof on an event's EventTarget", preferInstanceofRule, {
    valid: [
        {
            name: "targetNode?.instanceOf() is not reported",
            code: "export function f(e: MouseEvent) { if (e.targetNode?.instanceOf(HTMLElement)) {} }",
        },
        {
            name: "a class that is not a Node is not reported",
            code: "class Widget {} export function f(e: MouseEvent) { if (e.target instanceof Window || e.target instanceof Widget) {} }",
        },
        {
            name: "a constructor of the target's own window is not reported",
            code: "export function f(e: MouseEvent, el: HTMLElement) { if (e.target instanceof el.win.HTMLElement) {} }",
        },
        {
            name: "an EventTarget that is not an event's property is not reported",
            code: "export function f(target: EventTarget) { if (target instanceof HTMLElement) {} }",
        },
        {
            name: "a check that falls back to instanceOf() is not reported (operon)",
            code: "export function f(event: PointerEvent) { const target = event.target instanceof Element || (event.target as Node | null)?.instanceOf?.(Element); return target; }",
        },
    ],
    invalid: [
        {
            name: "a guard on a MouseEvent's target suggests targetNode, rewriting the reads after it (IconPicker)",
            code: `export function onClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) return;
    const icon = event.target.closest(".icon");
    return icon;
}`,
            output: null,
            errors: [
                eventTargetError("event.target", "HTMLElement", [
                    {
                        messageId: "useTargetNode",
                        output: `export function onClick(event: MouseEvent) {
    if (!(event.targetNode?.instanceOf(HTMLElement))) return;
    const icon = event.targetNode.closest(".icon");
    return icon;
}`,
                    },
                ]),
            ],
        },
        {
            name: "a check followed by && in a listener's arrow function suggests targetNode",
            code: `declare const el: HTMLElement;
el.addEventListener("click", (e) => { if (e.target instanceof Element && e.target.closest(".ponly")) e.stopPropagation(); });`,
            output: null,
            errors: [
                eventTargetError("e.target", "Element", [
                    {
                        messageId: "useTargetNode",
                        output: `declare const el: HTMLElement;
el.addEventListener("click", (e) => { if (e.targetNode?.instanceOf(Element) && e.targetNode.closest(".ponly")) e.stopPropagation(); });`,
                    },
                ]),
            ],
        },
        {
            name: "a ?: on a DragEvent's target suggests targetNode in both places",
            code: "export function onDrop(e: DragEvent) { const target = e.target instanceof HTMLElement ? e.target : null; return target; }",
            output: null,
            errors: [
                eventTargetError("e.target", "HTMLElement", [
                    {
                        messageId: "useTargetNode",
                        output: "export function onDrop(e: DragEvent) { const target = e.targetNode?.instanceOf(HTMLElement) ? e.targetNode : null; return target; }",
                    },
                ]),
            ],
        },
        {
            name: "two checks of a KeyboardEvent's target each suggest targetNode for every read",
            code: "export function onKey(e: KeyboardEvent) { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; }",
            output: null,
            errors: [
                eventTargetError("e.target", "HTMLInputElement", [
                    {
                        messageId: "useTargetNode",
                        output: "export function onKey(e: KeyboardEvent) { if (e.targetNode?.instanceOf(HTMLInputElement) || e.targetNode instanceof HTMLTextAreaElement) return; }",
                    },
                ]),
                eventTargetError("e.target", "HTMLTextAreaElement", [
                    {
                        messageId: "useTargetNode",
                        output: "export function onKey(e: KeyboardEvent) { if (e.targetNode instanceof HTMLInputElement || e.targetNode?.instanceOf(HTMLTextAreaElement)) return; }",
                    },
                ]),
            ],
        },
        {
            name: "relatedTarget whose narrowing is not used again suggests a cast to Node",
            code: "declare function clear(): void; export function onLeave(event: DragEvent) { if (!(event.relatedTarget instanceof Node)) clear(); }",
            output: null,
            errors: [
                eventTargetError("event.relatedTarget", "Node", [
                    {
                        messageId: "castToNode",
                        output: "declare function clear(): void; export function onLeave(event: DragEvent) { if (!((event.relatedTarget as Node | null)?.instanceOf(Node))) clear(); }",
                    },
                ]),
            ],
        },
        {
            name: "relatedTarget narrowed for a later read gets no suggestion (boardmd)",
            code: "export function onLeave(event: DragEvent, list: HTMLElement) { if (!(event.relatedTarget instanceof Node) || !list.contains(event.relatedTarget)) list.empty(); }",
            output: null,
            errors: [eventTargetError("event.relatedTarget", "Node")],
        },
        {
            name: "a FocusEvent's target, which may be the window, gets no suggestion",
            code: "export function onFocus(e: FocusEvent) { if (e.target instanceof HTMLElement) {} }",
            output: null,
            errors: [eventTargetError("e.target", "HTMLElement")],
        },
        {
            name: "a plain Event's target, which has no targetNode, gets no suggestion",
            code: "export function onChange(ev: Event) { if (!(ev.target instanceof HTMLInputElement)) return; return ev.target.value; }",
            output: null,
            errors: [eventTargetError("ev.target", "HTMLInputElement")],
        },
        {
            name: "currentTarget and srcElement get no suggestion",
            code: "export function f(event: MouseEvent) { if (event.currentTarget instanceof HTMLElement || event.srcElement instanceof Text) {} }",
            output: null,
            errors: [eventTargetError("event.currentTarget", "HTMLElement"), eventTargetError("event.srcElement", "Text")],
        },
        {
            name: "a check whose value is returned gets no suggestion, as ?. makes it undefined",
            code: "export function f(e: MouseEvent): boolean { return e.target instanceof Node; }",
            output: null,
            errors: [eventTargetError("e.target", "Node")],
        },
        {
            name: "a target also compared to the window gets no suggestion",
            code: "export function f(e: MouseEvent) { if (e.target === window) return; if (e.target instanceof SVGElement) {} }",
            output: null,
            errors: [eventTargetError("e.target", "SVGElement")],
        },
        {
            name: "a target also kept in a let gets no suggestion",
            code: "export function f(e: MouseEvent) { let t = e.target; if (e.target instanceof HTMLElement) t = window; return t; }",
            output: null,
            errors: [eventTargetError("e.target", "HTMLElement")],
        },
        {
            name: "an event parameter that is reassigned gets no suggestion",
            code: "declare const other: MouseEvent; export function f(e: MouseEvent) { if (e.target instanceof HTMLElement) {} e = other; }",
            output: null,
            errors: [eventTargetError("e.target", "HTMLElement")],
        },
        {
            name: "a React synthetic event's target is reported without a suggestion",
            code: `declare namespace React {
    interface SyntheticEvent<E = Event> { nativeEvent: E; target: EventTarget; }
    interface MouseEvent extends SyntheticEvent<globalThis.MouseEvent> {}
}
export function onClick(e: React.MouseEvent) { if (e.target instanceof HTMLElement) {} }`,
            output: null,
            errors: [eventTargetError("e.target", "HTMLElement")],
        },
    ],
});

// Popout windows came with Obsidian 0.15.0, and instanceOf() and targetNode
// with 0.15.3: below 0.15.0 nothing is reported, and below 0.15.3 nothing is
// fixed or suggested. With no version known, the fix stays, and a suggestion
// says which version it needs.
const versionRuleTester = new RuleTester();
const versionObsidianRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/obsidian-project` },
    },
});
const at = (minAppVersion: string): [{ minAppVersion: string }] => [{ minAppVersion }];
const NODE_CHECK = `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el instanceof HTMLElement) {}
            `;
const NULLABLE_CHECK = `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                if (el.parentElement instanceof HTMLDivElement) {}
            `;

versionRuleTester.run("prefer-instanceof and minAppVersion", preferInstanceofRule, {
    valid: [
        { name: "below 0.15.0, which has no popout windows, nothing is reported", code: NODE_CHECK, options: at("0.14.9") },
    ],
    invalid: [
        {
            name: "at 0.15.0 it is reported without a fix",
            code: NODE_CHECK,
            options: at("0.15.0"),
            output: null,
            errors: [{ messageId: "preferInstanceof", suggestions: [] }],
        },
        {
            name: "at 0.15.2 a nullable value gets no suggestion",
            code: NULLABLE_CHECK,
            options: at("0.15.2"),
            output: null,
            errors: [{ messageId: "preferInstanceof", suggestions: [] }],
        },
        {
            name: "with the repository's manifest.json at 0.15.0 it is reported without a fix",
            code: NODE_CHECK,
            output: null,
            errors: [{ messageId: "preferInstanceof", suggestions: [] }],
        },
        {
            name: "at 0.15.3 it is fixed",
            code: NODE_CHECK,
            options: at("0.15.3"),
            output: NODE_CHECK.replace("el instanceof HTMLElement", "el.instanceOf(HTMLElement)"),
            errors: [{ messageId: "preferInstanceof" }],
        },
        {
            name: "with an unknown version it is fixed as before",
            code: NODE_CHECK,
            options: at("latest"),
            output: NODE_CHECK.replace("el instanceof HTMLElement", "el.instanceOf(HTMLElement)"),
            errors: [{ messageId: "preferInstanceof" }],
        },
        {
            name: "with an unknown version a suggestion says it needs 0.15.3",
            code: NULLABLE_CHECK,
            options: at("latest"),
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [
                        {
                            messageId: "preferInstanceofOptionalSuggestionSince",
                            data: { className: "HTMLDivElement", since: "0.15.3" },
                            output: NULLABLE_CHECK.replace("el.parentElement instanceof HTMLDivElement", "el.parentElement?.instanceOf(HTMLDivElement)"),
                        },
                    ],
                },
            ],
        },
    ],
});

const TARGET_CHECK = "export function f(e: MouseEvent) { if (e.target instanceof HTMLElement) {} }";
const RELATED_CHECK = "export function f(e: MouseEvent) { if (e.relatedTarget instanceof Node) {} }";

versionObsidianRuleTester.run("prefer-instanceof on event targets and minAppVersion", preferInstanceofRule, {
    valid: [{ name: "below 0.15.0 an event target is not reported", code: TARGET_CHECK, options: at("0.14.9") }],
    invalid: [
        {
            name: "at 0.15.2 an event target is reported without a suggestion",
            code: TARGET_CHECK,
            options: at("0.15.2"),
            output: null,
            errors: [{ messageId: "preferInstanceofOnEventTarget", suggestions: [] }],
        },
        {
            name: "at 0.15.3 targetNode is suggested",
            code: TARGET_CHECK,
            options: at("0.15.3"),
            output: null,
            errors: [
                {
                    messageId: "preferInstanceofOnEventTarget",
                    suggestions: [{ messageId: "useTargetNode", output: TARGET_CHECK.replace("e.target instanceof HTMLElement", "e.targetNode?.instanceOf(HTMLElement)") }],
                },
            ],
        },
        {
            name: "with an unknown version targetNode and the cast say they need 0.15.3",
            code: `${TARGET_CHECK} ${RELATED_CHECK.replace("function f", "function g")}`,
            options: at("latest"),
            output: null,
            errors: [
                {
                    messageId: "preferInstanceofOnEventTarget",
                    suggestions: [
                        {
                            messageId: "useTargetNodeSince",
                            output: `${TARGET_CHECK.replace("e.target instanceof HTMLElement", "e.targetNode?.instanceOf(HTMLElement)")} ${RELATED_CHECK.replace("function f", "function g")}`,
                        },
                    ],
                },
                {
                    messageId: "preferInstanceofOnEventTarget",
                    suggestions: [
                        {
                            messageId: "castToNodeSince",
                            output: `${TARGET_CHECK} ${RELATED_CHECK.replace("function f", "function g").replace("e.relatedTarget instanceof Node", "(e.relatedTarget as Node | null)?.instanceOf(Node)")}`,
                        },
                    ],
                },
            ],
        },
    ],
});

const optional = (className: string, output: string) => [{
    messageId: "preferInstanceofOptionalSuggestion" as const,
    data: { className },
    output,
}];

// `e.relatedTarget as HTMLElement` leaves `null` out of the type but not out
// of the value: `next.instanceOf()` threw where `instanceof` was false.
ruleTester.run("prefer-instanceof with a type assertion that leaves out null", preferInstanceofRule, {
    valid: [],
    invalid: [
        {
            name: "a const set to a cast of a nullable value",
            code: `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent, box: HTMLElement) {
                    const next = e.relatedTarget as HTMLElement;
                    if (next instanceof HTMLElement && box.contains(next)) return;
                }`,
            output: null,
            errors: [{
                messageId: "preferInstanceof",
                suggestions: optional("HTMLElement", `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent, box: HTMLElement) {
                    const next = e.relatedTarget as HTMLElement;
                    if (next?.instanceOf(HTMLElement) && box.contains(next)) return;
                }`),
            }],
        },
        {
            name: "a cast in the check, with <T> and through unknown",
            code: `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent) {
                    if ((e.relatedTarget as Node) instanceof HTMLElement) {}
                    if ((e.relatedTarget as unknown as Node) instanceof HTMLElement) {}
                }`,
            output: null,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: optional("HTMLElement", `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent) {
                    if ((e.relatedTarget as Node)?.instanceOf(HTMLElement)) {}
                    if ((e.relatedTarget as unknown as Node) instanceof HTMLElement) {}
                }`),
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: optional("HTMLElement", `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent) {
                    if ((e.relatedTarget as Node) instanceof HTMLElement) {}
                    if ((e.relatedTarget as unknown as Node)?.instanceOf(HTMLElement)) {}
                }`),
                },
            ],
        },
        {
            name: "a cast of a value that is never null, and a non-null assertion, are still fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const target: EventTarget;
                declare const el: HTMLElement;
                const node = target as Node;
                if (node instanceof HTMLElement) {}
                if (el.parentElement! instanceof HTMLElement) {}`,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const target: EventTarget;
                declare const el: HTMLElement;
                const node = target as Node;
                if (node.instanceOf(HTMLElement)) {}
                if (el.parentElement!.instanceOf(HTMLElement)) {}`,
            errors: [{ messageId: "preferInstanceof" }, { messageId: "preferInstanceof" }],
        },
    ],
});

nonStrictRuleTester.run("prefer-instanceof without strictNullChecks, past an annotation or a field", preferInstanceofRule, {
    valid: [],
    invalid: [
        {
            name: "an annotated variable set from a nullable call",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const root: HTMLElement;
                const input: Element = root.querySelector("input");
                if (input instanceof HTMLInputElement) {}`,
            output: null,
            errors: [{
                messageId: "preferInstanceof",
                suggestions: optional("HTMLInputElement", `${OBSIDIAN_INSTANCEOF}
                declare const root: HTMLElement;
                const input: Element = root.querySelector("input");
                if (input?.instanceOf(HTMLInputElement)) {}`),
            }],
        },
        {
            name: "a cast of a nullable value",
            code: `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent) {
                    if ((e.relatedTarget as Node) instanceof HTMLElement) {}
                }`,
            output: null,
            errors: [{
                messageId: "preferInstanceof",
                suggestions: optional("HTMLElement", `${OBSIDIAN_INSTANCEOF}
                export function onBlur(e: FocusEvent) {
                    if ((e.relatedTarget as Node)?.instanceOf(HTMLElement)) {}
                }`),
            }],
        },
        {
            name: "a class field without an initializer, set later",
            code: `${OBSIDIAN_INSTANCEOF}
                export class V {
                    inputEl: Element;
                    check() { if (this.inputEl instanceof HTMLInputElement) {} }
                }`,
            output: null,
            errors: [{
                messageId: "preferInstanceof",
                suggestions: optional("HTMLInputElement", `${OBSIDIAN_INSTANCEOF}
                export class V {
                    inputEl: Element;
                    check() { if (this.inputEl?.instanceOf(HTMLInputElement)) {} }
                }`),
            }],
        },
        {
            name: "a field with an initializer, a !, or set in the constructor is still fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare function make(): Element;
                export class V {
                    a: Element = make();
                    b!: Element;
                    c: Element;
                    constructor() { this.c = make(); }
                    check() { return [this.a instanceof HTMLElement, this.b instanceof HTMLElement, this.c instanceof HTMLElement]; }
                }`,
            output: `${OBSIDIAN_INSTANCEOF}
                declare function make(): Element;
                export class V {
                    a: Element = make();
                    b!: Element;
                    c: Element;
                    constructor() { this.c = make(); }
                    check() { return [this.a.instanceOf(HTMLElement), this.b.instanceOf(HTMLElement), this.c.instanceOf(HTMLElement)]; }
                }`,
            errors: [{ messageId: "preferInstanceof" }, { messageId: "preferInstanceof" }, { messageId: "preferInstanceof" }],
        },
    ],
});

// Node.instanceOf() takes a `new () => T`: `el.instanceOf(Base)` did not
// compile for an abstract class or one whose constructor needs arguments.
// Such a class is the plugin's own, which `instanceof` finds in every window.
ruleTester.run("prefer-instanceof against a class instanceOf() cannot take", preferInstanceofRule, {
    valid: [
        {
            name: "an abstract class, and a constructor with a required parameter",
            code: `${OBSIDIAN_INSTANCEOF}
                abstract class Base extends HTMLElement {}
                class Widget extends HTMLElement { constructor(public id2: string) { super(); } }
                declare const el: Node;
                declare const evt: UIEvent;
                abstract class BaseEvent extends MouseEvent {}
                if (el instanceof Base || el instanceof Widget || evt instanceof BaseEvent) {}`,
        },
    ],
    invalid: [
        {
            name: "an optional parameter, an inherited constructor, and an event class with arguments",
            code: `${OBSIDIAN_INSTANCEOF}
                class Widget extends HTMLElement { constructor(public id2?: string) { super(); } }
                class Plain extends HTMLElement {}
                declare const el: Node;
                declare const evt: UIEvent;
                if (el instanceof Widget || el instanceof Plain || evt instanceof MouseEvent) {}`,
            output: `${OBSIDIAN_INSTANCEOF}
                class Widget extends HTMLElement { constructor(public id2?: string) { super(); } }
                class Plain extends HTMLElement {}
                declare const el: Node;
                declare const evt: UIEvent;
                if (el.instanceOf(Widget) || el.instanceOf(Plain) || evt.instanceOf(MouseEvent)) {}`,
            errors: [{ messageId: "preferInstanceof" }, { messageId: "preferInstanceof" }, { messageId: "preferInstanceof" }],
        },
    ],
});

ruleTester.run("prefer-instanceof with a comment outside the operands", preferInstanceofRule, {
    valid: [],
    invalid: [
        {
            name: "is offered as a suggestion only, and a comment inside an operand is kept by the fix",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el /* popout-safe? */ instanceof HTMLElement) {}
                if (el instanceof /* the class */ HTMLElement) {}
                if ((el /* kept */ as Node) instanceof HTMLElement) {}`,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el /* popout-safe? */ instanceof HTMLElement) {}
                if (el instanceof /* the class */ HTMLElement) {}
                if ((el /* kept */ as Node).instanceOf(HTMLElement)) {}`,
            errors: [
                {
                    messageId: "preferInstanceof",
                    suggestions: [{ messageId: "preferInstanceofSuggestion", data: { className: "HTMLElement" }, output: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el.instanceOf(HTMLElement)) {}
                if (el instanceof /* the class */ HTMLElement) {}
                if ((el /* kept */ as Node) instanceof HTMLElement) {}` }],
                },
                {
                    messageId: "preferInstanceof",
                    suggestions: [{ messageId: "preferInstanceofSuggestion", data: { className: "HTMLElement" }, output: `${OBSIDIAN_INSTANCEOF}
                declare const el: Node;
                if (el /* popout-safe? */ instanceof HTMLElement) {}
                if (el.instanceOf(HTMLElement)) {}
                if ((el /* kept */ as Node) instanceof HTMLElement) {}` }],
                },
                { messageId: "preferInstanceof" },
            ],
        },
    ],
});
