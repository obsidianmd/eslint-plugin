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
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab {}
            `,
        },
        {
            name: "an unknown minAppVersion option is a no-op",
            options: [{ minAppVersion: "1.12" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {}
            `,
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
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 in this repository)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {}
            `,
            errors: [{ messageId: "missingDisplay" }],
        },
        {
            name: "a class expression without display() is an error",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {};
            `,
            errors: [{ messageId: "missingDisplay" }],
        },
    ],
});
