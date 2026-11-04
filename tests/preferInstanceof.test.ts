import { RuleTester } from "@typescript-eslint/rule-tester";
import preferInstanceofRule from "../lib/rules/preferInstanceof.js";

const ruleTester = new RuleTester();

const MOCK_DOM = `
    declare class Node {
        instanceOf<T>(type: { new(): T }): this is T;
    }
    declare class Element extends Node {}
    declare class HTMLElement extends Element {}
    declare class HTMLDivElement extends HTMLElement {}

    declare class UIEvent {
        instanceOf<T>(type: { new(...data: any[]): T }): this is T;
    }
    declare class MouseEvent extends UIEvent {}
    declare class KeyboardEvent extends UIEvent {}
`;

// DOM types WITHOUT the instanceOf method (standard browser types, no Obsidian augmentation)
const MOCK_DOM_NO_INSTANCEOF = `
    declare class Node {}
    declare class Element extends Node {}
    declare class HTMLElement extends Element {}

    declare class UIEvent {}
    declare class MouseEvent extends UIEvent {}
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
const nonStrictRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: "./tests/fixtures/tsconfig.non-strict.json" } },
});

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
    ],
});
