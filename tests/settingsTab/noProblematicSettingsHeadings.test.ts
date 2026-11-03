import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/settingsTab/noProblematicSettingsHeadings.js";

const MOCK_CLASS = `
    declare class Setting { setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: HTMLElement; }
`;

const ruleTester = new RuleTester();

ruleTester.run("no-problematic-settings-headings", rule, {
    valid: [
        {
            name: "custom heading name is allowed",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("My Section").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "a heading outside a settings tab is not checked",
            code: `
                ${MOCK_CLASS}
                declare const el: unknown;
                new Setting(el).setName("General settings").setHeading();
            `,
        },
        {
            name: "a heading whose name is not a string literal is not checked",
            code: `
                ${MOCK_CLASS}
                declare const label: string;
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName(label).setHeading();
                    }
                }
            `,
        },
    ],
    invalid: [
        {
            name: "heading with 'Settings' is forbidden",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("Plugin Settings").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "settings" }],
        },
        {
            name: "heading with 'General Options' triggers both settings and general",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("General Options").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [
                { messageId: "settings" },
                { messageId: "general" },
            ],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        ;
                    }
                }
            `,
        },
        {
            name: "heading with 'General' is forbidden and auto-removed",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("General").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "general" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        ;
                    }
                }
            `,
        },
        {
            name: "heading containing plugin name is forbidden and auto-removed",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("My Awesome Plugin Configuration").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        ;
                    }
                }
            `,
        },
        {
            name: "'options' alone is reported without a fix",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("Display options").setHeading();
                    }
                }
            `,
            errors: [{ messageId: "settings" }],
        },
        {
            name: "the plugin name defaults to manifest.json (Sample Plugin in this repository)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("Sample Plugin").setHeading();
                    }
                }
            `,
            errors: [{ messageId: "pluginName" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        ;
                    }
                }
            `,
        },
    ],
});
