import { RuleTester } from "@typescript-eslint/rule-tester";
import preferUpdateOverDisplayRule from "../../lib/rules/settingsTab/preferUpdateOverDisplay.js";

const MOCK_CLASS = `declare class PluginSettingTab { update(): void; display(): void; }`;

const ruleTester = new RuleTester();

ruleTester.run("prefer-update-over-display", preferUpdateOverDisplayRule, {
    valid: [
        {
            name: "this.update() is allowed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.update(); }
                }
            `,
        },
        {
            name: "this.display() below 1.13 is left alone",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "this.display() outside a PluginSettingTab is ignored",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                class Foo {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab { refresh() { this.display(); } }
            `,
        },
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 here, so display() stays)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "display() on another object is not reported",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare const other: { display(): void };
                class MyTab extends PluginSettingTab {
                    refresh() { other.display(); }
                }
            `,
        },
    ],
    invalid: [
        {
            name: "this.display() at 1.13 is flagged and fixed to this.update()",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() {
                        this.display();
                    }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() {
                        this.update();
                    }
                }
            `,
        },
        {
            name: "this.display() in an arrow callback is flagged and fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare function onChange(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    build() { onChange(() => this.display()); }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                declare function onChange(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    build() { onChange(() => this.update()); }
                }
            `,
        },
        {
            name: "this.display() in a class expression is flagged and fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { refresh() { this.display(); } };
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { refresh() { this.update(); } };
            `,
        },
        {
            name: "this.display() in an abstract settings tab is flagged too",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab { refresh() { this.display(); } }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab { refresh() { this.update(); } }
            `,
        },
    ],
});
