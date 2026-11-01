import { RuleTester } from "@typescript-eslint/rule-tester";
import noAwaitChainableRule from "../lib/rules/noAwaitChainable.js";

const ruleTester = new RuleTester();

const MOCK_OBSIDIAN = `
    declare abstract class BaseComponent {
        then(cb: (component: this) => any): this;
    }
    declare class ButtonComponent extends BaseComponent {
        setButtonText(name: string): this;
    }
    declare class Setting {
        constructor(containerEl: HTMLElement);
        setName(name: string): this;
        addButton(cb: (component: ButtonComponent) => any): this;
        then(cb: (setting: this) => any): this;
    }
    declare const containerEl: HTMLElement;
`;

ruleTester.run("no-await-chainable", noAwaitChainableRule, {
    valid: [
        {
            name: "Setting chain without await is allowed",
            code: `
                ${MOCK_OBSIDIAN}
                async function display() {
                    new Setting(containerEl).setName('Name');
                }
            `,
        },
        {
            name: "awaiting a promise is allowed",
            code: `
                ${MOCK_OBSIDIAN}
                async function display(load: () => Promise<void>) {
                    await load();
                    new Setting(containerEl).setName('Name');
                }
            `,
        },
        {
            name: "awaiting another thenable is allowed",
            code: `
                class Deferred {
                    then(resolve: (value: number) => void) {
                        resolve(1);
                    }
                }
                async function run() {
                    await new Deferred();
                }
            `,
        },
        {
            name: "returning a Setting from a non-async function is allowed",
            code: `
                ${MOCK_OBSIDIAN}
                function create() {
                    return new Setting(containerEl);
                }
            `,
        },
        {
            name: "returning a Setting from a nested non-async function is allowed",
            code: `
                ${MOCK_OBSIDIAN}
                async function display() {
                    const create = () => new Setting(containerEl);
                    create();
                }
            `,
        },
    ],
    invalid: [
        {
            name: "awaiting a Setting is forbidden",
            code: `
                ${MOCK_OBSIDIAN}
                async function display() {
                    await new Setting(containerEl).setName('Name');
                }
            `,
            errors: [
                {
                    messageId: "await",
                    data: {
                        className: "Setting",
                    },
                },
            ],
        },
        {
            name: "awaiting a component subclass is forbidden",
            code: `
                ${MOCK_OBSIDIAN}
                async function display(button: ButtonComponent) {
                    await button.setButtonText('Save');
                }
            `,
            errors: [
                {
                    messageId: "await",
                    data: {
                        className: "ButtonComponent",
                    },
                },
            ],
        },
        {
            name: "awaiting a possibly undefined Setting is forbidden",
            code: `
                ${MOCK_OBSIDIAN}
                async function display(setting: Setting | undefined) {
                    await setting;
                }
            `,
            errors: [
                {
                    messageId: "await",
                },
            ],
        },
        {
            name: "returning a Setting from an async function is forbidden",
            code: `
                ${MOCK_OBSIDIAN}
                async function create() {
                    return new Setting(containerEl);
                }
            `,
            errors: [
                {
                    messageId: "return",
                    data: {
                        className: "Setting",
                    },
                },
            ],
        },
        {
            name: "an async arrow function returning a Setting is forbidden",
            code: `
                ${MOCK_OBSIDIAN}
                const create = async () => new Setting(containerEl);
            `,
            errors: [
                {
                    messageId: "return",
                },
            ],
        },
    ],
});
