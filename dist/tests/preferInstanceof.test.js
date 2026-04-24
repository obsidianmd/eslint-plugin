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
    ],
});
