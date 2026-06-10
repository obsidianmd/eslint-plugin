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
    ],
});
