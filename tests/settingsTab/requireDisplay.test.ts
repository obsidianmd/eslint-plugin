import { RuleTester } from "@typescript-eslint/rule-tester";
import requireDisplayRule from "../../lib/rules/settingsTab/requireDisplay.js";

const MOCK_CLASS = `declare class PluginSettingTab {}`;

const ruleTester = new RuleTester();

ruleTester.run("require-display", requireDisplayRule, {
    valid: [
        {
            name: "minAppVersion below 1.13 with a display() method is allowed",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                }
            `,
        },
        {
            name: "display() as an arrow class field counts as provided",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display = () => {};
                }
            `,
        },
        {
            name: "minAppVersion 1.13 without display() is allowed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "unknown/invalid minAppVersion is a no-op",
            options: [{ minAppVersion: "not-a-version" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {}
            `,
        },
        {
            name: "abstract base class is skipped",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab {}
            `,
        },
        {
            name: "class not extending PluginSettingTab is ignored",
            options: [{ minAppVersion: "1.12.0" }],
            code: `class Foo {}`,
        },
    ],
    invalid: [
        {
            name: "minAppVersion below 1.13 without display() is an error",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                }
            `,
            errors: [
                {
                    messageId: "missingDisplay",
                    data: { minAppVersion: "1.12.0" },
                },
            ],
        },
    ],
});
