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

        // --- Declared without null or undefined: still fixed ---
        {
            name: "a value cast to a type without null is fixed",
            code: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstElementChild as Element;
                if (child instanceof HTMLElement) {}
            `,
            output: `${OBSIDIAN_INSTANCEOF}
                declare const el: HTMLElement;
                const child = el.firstElementChild as Element;
                if (child.instanceOf(HTMLElement)) {}
            `,
            errors: [{ messageId: "preferInstanceof", data: { className: "HTMLElement" } }],
        },
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
