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
    ],
});
