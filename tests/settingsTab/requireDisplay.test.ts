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
            name: "display() under a quoted name counts as provided",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    "display"() {}
                }
            `,
        },
        {
            name: "display() computed from a string counts as provided",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class StringTab extends PluginSettingTab {
                    ["display"]() {}
                }
                class TemplateTab extends PluginSettingTab {
                    [\`display\`] = () => {};
                }
            `,
        },
        {
            name: "a static block or an index signature before display() does not end the search",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    [key: string]: unknown;
                    static {}
                    display() {}
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
                    // The class name is highlighted, not the whole class.
                    line: 3,
                    column: 23,
                    endLine: 3,
                    endColumn: 28,
                },
            ],
        },
        {
            name: "a computed member named by a variable called display is not display()",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                const display = "render";
                class MyTab extends PluginSettingTab {
                    [display]() {}
                }
            `,
            errors: [{ messageId: "missingDisplay" }],
        },
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 in this repository)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {}
            `,
            errors: [{ messageId: "missingDisplay", data: { minAppVersion: "0.15.0" } }],
        },
        {
            name: "a class expression without display() is an error",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {};
            `,
            // An anonymous class is highlighted at its superclass.
            errors: [{ messageId: "missingDisplay", line: 3, column: 45, endColumn: 61 }],
        },
        {
            name: "an anonymous default-exported class is highlighted at its superclass",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                export default class extends PluginSettingTab {}
            `,
            errors: [{ messageId: "missingDisplay", line: 3, column: 46, endColumn: 62 }],
        },
    ],
});
