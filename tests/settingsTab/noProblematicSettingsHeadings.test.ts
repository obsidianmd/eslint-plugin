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
        // The nearest enclosing class decides whether a heading is in a settings tab.
        {
            name: "a heading in a class nested in a settings tab is not checked",
            code: tab(`
                class Section {
                    render(el: HTMLElement) {
                        new Setting(el).setName("General").setHeading();
                    }
                }
                const View = class {
                    render(el: HTMLElement) {
                        new Setting(el).setName("General").setHeading();
                    }
                };`),
        },
        {
            name: "a heading after a settings tab nested in another class is not checked",
            code: `
                ${MOCK_CLASS}
                class Plugin {
                    load(el: HTMLElement) {
                        class MyTab extends PluginSettingTab {}
                        new Setting(el).setName("General").setHeading();
                    }
                }
            `,
        },
        // The heading's name is the last setName() in the chain, wherever setHeading() is.
        {
            name: "a setting that is not a heading is not checked, whatever its name",
            code: tab(`new Setting(this.containerEl).setName("General").setDesc("Applies everywhere.");`),
        },
        {
            name: "a name replaced by a later setName() is not checked",
            code: tab(`
                new Setting(this.containerEl).setName("General").setHeading().setName("Appearance");
                new Setting(this.containerEl).setName("General").setName("Appearance").setHeading();`),
        },
        {
            name: "a name replaced by a later setName() that is not a string literal is not checked",
            code: `
                declare const label: string;
                ${tab(`new Setting(this.containerEl).setName("General").setHeading().setName(label);`)}
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
        // A class nested in the tab used to end the check for the rest of the tab.
        {
            name: "a heading after a class nested in the tab is reported",
            code: tab(`
                class Inner {}
                new Setting(this.containerEl).setName("General").setHeading();`),
            output: tab(`
                class Inner {}
                ;`),
            errors: [{ messageId: "general" }],
        },
        {
            name: "a heading in a callback or a nested function of the tab is reported",
            code: tab(`
                class Inner {}
                [1].forEach(() => { new Setting(this.containerEl).setName("General").setHeading(); });
                function renderSection(el: HTMLElement) { new Setting(el).setName("Display options").setHeading(); }`),
            output: tab(`
                class Inner {}
                [1].forEach(() => { ; });
                function renderSection(el: HTMLElement) { new Setting(el).setName("Display options").setHeading(); }`),
            errors: [{ messageId: "general" }, { messageId: "settings" }],
        },
        {
            name: "a settings tab written as a class expression is checked",
            code: `
                ${MOCK_CLASS}
                export const MyTab = class extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("General").setHeading();
                    }
                };
            `,
            output: `
                ${MOCK_CLASS}
                export const MyTab = class extends PluginSettingTab {
                    display() {
                        ;
                    }
                };
            `,
            errors: [{ messageId: "general" }],
        },
        {
            name: "a settings tab nested in another class is checked",
            code: `
                ${MOCK_CLASS}
                class Plugin {
                    makeTab() {
                        return class extends PluginSettingTab {
                            display() {
                                new Setting(this.containerEl).setName("Plugin settings").setHeading();
                            }
                        };
                    }
                }
            `,
            errors: [{ messageId: "settings" }],
        },
        // setName() after setHeading() names the heading as well.
        {
            name: "a heading named after setHeading() is reported and removed",
            code: tab(`
                new Setting(this.containerEl).setHeading().setName("General");
                new Setting(this.containerEl).setHeading().setName("Sample Plugin").setClass("x");`),
            output: tab(`
                ;
                ;`),
            errors: [{ messageId: "general" }, { messageId: "pluginName" }],
        },
        {
            name: "a heading named after setHeading() with 'settings' is reported without a fix",
            code: tab(`new Setting(this.containerEl).setHeading().setName("Advanced settings");`),
            errors: [{ messageId: "settings" }],
        },
        {
            name: "the last setName() names the heading",
            code: tab(`new Setting(this.containerEl).setName("Appearance").setHeading().setName("General");`),
            output: tab(`;`),
            errors: [{ messageId: "general" }],
        },
        {
            name: "a heading named after setHeading() with a control is not removed",
            code: tab(`new Setting(this.containerEl).setHeading().setName("General").addButton((btn) => btn.setIcon("x"));`),
            output: null,
            errors: [{ messageId: "general", suggestions: [] }],
        },
        {
            name: "a heading named after setHeading() whose value is used is not removed",
            code: tab(`const heading = new Setting(this.containerEl).setHeading().setName("General");`),
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
