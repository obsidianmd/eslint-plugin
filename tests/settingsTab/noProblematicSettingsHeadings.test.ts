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
            name: "a chain that does not start from a method call is not checked, and does not crash",
            code: `
                ${MOCK_CLASS}
                declare function getSetting(): Setting;
                class MyTab extends PluginSettingTab {
                    display() {
                        getSetting().setName("General").setHeading();
                    }
                }
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
        // Patterns from the community-plugin run. Removing only setHeading() from
        // a longer chain left `.setClass(…)` as a statement of its own.
        {
            name: "a heading chain that continues after setHeading() is removed as a whole (notes-explorer)",
            code: tab(`
                new Setting(this.containerEl)
                    .setName("Notes explorer settings")
                    .setHeading()
                    .setClass("notes-explorer-setting-tab-header");
                new Setting(this.containerEl).setName("Launch on start");`),
            options: [{ pluginName: "Notes Explorer" }],
            output: tab(`
                ;
                new Setting(this.containerEl).setName("Launch on start");`),
            errors: [{ messageId: "settings" }, { messageId: "pluginName" }],
        },
        {
            name: "a heading with a control is not removed (spacekeys)",
            code: tab(`
                new Setting(this.containerEl)
                    .setName("Spacekeys keymap file")
                    .setDesc("YAML or Markdown file defining a custom keymap.")
                    .setHeading()
                    .addButton((btn) => btn.setIcon("refresh-cw"));`),
            options: [{ pluginName: "Spacekeys" }],
            output: null,
            errors: [{ messageId: "pluginName", suggestions: [] }],
        },
        {
            name: "removing a heading with a description is a suggestion",
            code: tab(`new Setting(this.containerEl).setName("General").setDesc("Applies everywhere.").setHeading();`),
            output: null,
            errors: [{
                messageId: "general",
                suggestions: [{ messageId: "removeHeading", output: tab(`;`) }],
            }],
        },
        {
            name: "removing a heading whose arguments have side effects is a suggestion",
            code: tab(`new Setting(this.containerEl.createDiv()).setName("General").setHeading();`),
            output: null,
            errors: [{
                messageId: "general",
                suggestions: [{ messageId: "removeHeading", output: tab(`;`) }],
            }],
        },
        {
            name: "a heading whose value is used is not removed (links, obsidian-plugin-groups)",
            code: tab(`
                const generalHeading = new Setting(this.containerEl).setName("General").setHeading();
                generalHeading.setClass("x");`),
            output: null,
            errors: [{ messageId: "general", suggestions: [] }],
        },
        {
            name: "a heading without a semicolon becomes an empty statement",
            code: tab(`
                if (this.containerEl) new Setting(this.containerEl).setName("General").setHeading()
                this.containerEl.empty()`),
            output: tab(`
                if (this.containerEl) ;
                this.containerEl.empty()`),
            errors: [{ messageId: "general" }],
        },
    ],
});

function tab(body: string): string {
    return `
        ${MOCK_CLASS}
        class MyTab extends PluginSettingTab {
            display() {
                ${body}
            }
        }
    `;
}
