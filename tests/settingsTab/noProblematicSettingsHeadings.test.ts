import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
import rule from "../../lib/rules/settingsTab/noProblematicSettingsHeadings.js";

const MOCK_CLASS = `
    declare class Setting { setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: HTMLElement; }
`;

const ruleTester = new RuleTester();

ruleTester.run("no-problematic-settings-headings", rule, {
    valid: [
        // --- A word among others names a section of its own ---
        {
            name: "a heading containing the plugin name among other words is allowed (numerals)",
            code: tab(`
                new Setting(this.containerEl).setHeading().setName("Inline Numerals");
                new Setting(this.containerEl).setName("My Awesome Plugin Configuration").setHeading();`),
            options: [{ pluginName: "Numerals" }],
        },
        {
            name: "the plugin name inside another word is allowed",
            code: tab(`
                new Setting(this.containerEl).setName("Backlinks").setHeading();
                new Setting(this.containerEl).setName("Recurring tasks").setHeading();`),
            options: [{ pluginName: "Links" }],
        },
        {
            name: "'general' among other words or inside a word is allowed, and 'settings' inside a word",
            code: tab(`
                new Setting(this.containerEl).setName("General appearance").setHeading();
                new Setting(this.containerEl).setName("Generalized search").setHeading();
                new Setting(this.containerEl).setName("Subsettings").setHeading();
                new Setting(this.containerEl).setName("Optionsmenu").setHeading();`),
        },
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
            name: "a heading without setName() is not checked, and does not crash",
            code: tab(`new Setting(this.containerEl).setHeading();`),
        },
        {
            name: "a chain that does not start from new Setting() is not checked",
            code: `
                declare class Row { constructor(el: HTMLElement); setName(name: string): this; setHeading(): this; }
                ${tab(`
                this.heading.setName("General").setHeading();
                new Row(this.containerEl).setName("General").setHeading();`)}
            `,
        },
        {
            // "" is a name, so the manifest's ("Sample Plugin" here) is not used either.
            name: "an empty pluginName turns the plugin-name check off",
            code: tab(`new Setting(this.containerEl).setName("Sample Plugin").setHeading();`),
            options: [{ pluginName: "" }],
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
            name: "the message names the word it matched (novel-word-count)",
            code: tab(`new Setting(this.containerEl).setName("Show advanced options").setHeading();`),
            output: null,
            errors: [{ messageId: "settings", data: { word: "options" }, suggestions: [] }],
        },
        {
            name: "the plugin name alone, in any case, is removed",
            code: tab(`new Setting(this.containerEl).setName("numerals").setHeading();`),
            options: [{ pluginName: "Numerals" }],
            output: tab(`;`),
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "'General settings' is a General heading, and is removed",
            code: tab(`new Setting(this.containerEl).setName("General settings").setHeading();`),
            output: tab(`;`),
            errors: [{ messageId: "settings", data: { word: "settings" } }, { messageId: "general" }],
        },
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
            name: "a heading that is the plugin name with 'settings' is forbidden and auto-removed",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("  my awesome plugin: Settings ").setHeading();
                    }
                }
            `,
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "settings", data: { word: "settings" } }, { messageId: "pluginName" }],
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
                    .setName("Spacekeys")
                    .setDesc("YAML or Markdown file defining a custom keymap.")
                    .setHeading()
                    .addButton((btn) => btn.setIcon("refresh-cw"));`),
            options: [{ pluginName: "Spacekeys" }],
            output: null,
            errors: [{ messageId: "pluginName", suggestions: [] }],
        },
        {
            name: "removing a heading with a description is a suggestion that says the description goes too",
            code: tab(`new Setting(this.containerEl).setName("General").setDesc("Applies everywhere.").setHeading();`),
            output: null,
            errors: [{
                messageId: "general",
                suggestions: [{ messageId: "removeHeading", data: { including: ", including `setDesc()`" }, output: tab(`;`) }],
            }],
        },
        {
            name: "removing a heading whose arguments have side effects is a suggestion",
            code: tab(`new Setting(this.containerEl.createDiv()).setName("General").setHeading();`),
            output: null,
            errors: [{
                messageId: "general",
                suggestions: [{ messageId: "removeHeading", data: { including: "" }, output: tab(`;`) }],
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
            name: "removing a heading with a tooltip or a disabled state is a suggestion",
            code: tab(`
                new Setting(this.containerEl).setName("General").setTooltip("Applies everywhere.").setHeading();
                new Setting(this.containerEl).setName("General").setDisabled(true).setHeading();`),
            output: null,
            errors: [
                {
                    messageId: "general",
                    suggestions: [{ messageId: "removeHeading", data: { including: ", including `setTooltip()`" }, output: tab(`
                ;
                new Setting(this.containerEl).setName("General").setDisabled(true).setHeading();`) }],
                },
                {
                    messageId: "general",
                    suggestions: [{ messageId: "removeHeading", data: { including: ", including `setDisabled()`" }, output: tab(`
                new Setting(this.containerEl).setName("General").setTooltip("Applies everywhere.").setHeading();
                ;`) }],
                },
            ],
        },
        {
            name: "a heading on a plain variable, or with a template literal class, is removed",
            code: tab(`
                [this.containerEl].forEach((el) => { new Setting(el).setName("General").setHeading(); });
                new Setting(this.containerEl).setName("General").setHeading().setClass(\`heading-\${this.id}\`);`),
            output: tab(`
                [this.containerEl].forEach((el) => { ; });
                ;`),
            errors: [{ messageId: "general" }, { messageId: "general" }],
        },
        {
            name: "removing a heading whose class or parent is computed with a side effect is a suggestion",
            code: tab(`
                new Setting(this.containerEl).setName("General").setHeading().setClass(this.headingClass());
                new Setting(this.containerEl).setName("General").setHeading().setClass(\`heading-\${this.nextId()}\`);
                new Setting(this.sections[this.index++]).setName("General").setHeading();`),
            output: null,
            errors: [
                {
                    messageId: "general",
                    suggestions: [{ messageId: "removeHeading", output: tab(`
                ;
                new Setting(this.containerEl).setName("General").setHeading().setClass(\`heading-\${this.nextId()}\`);
                new Setting(this.sections[this.index++]).setName("General").setHeading();`) }],
                },
                {
                    messageId: "general",
                    suggestions: [{ messageId: "removeHeading", output: tab(`
                new Setting(this.containerEl).setName("General").setHeading().setClass(this.headingClass());
                ;
                new Setting(this.sections[this.index++]).setName("General").setHeading();`) }],
                },
                {
                    messageId: "general",
                    suggestions: [{ messageId: "removeHeading", output: tab(`
                new Setting(this.containerEl).setName("General").setHeading().setClass(this.headingClass());
                new Setting(this.containerEl).setName("General").setHeading().setClass(\`heading-\${this.nextId()}\`);
                ;`) }],
                },
            ],
        },
        {
            name: "a heading whose method is passed on is not removed",
            code: `
                declare function register(fn: unknown): void;
                ${tab(`register(new Setting(this.containerEl).setName("General").setHeading().setClass);`)}
            `,
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

// The removal takes the whole statement, the description and tooltip with it,
// so the suggestion's description says so.
describe("no-problematic-settings-headings suggestion description", () => {
    it("says the whole heading setting goes, naming the calls that go with it", () => {
        const messages = new Linter().verify(`
            class MyTab extends PluginSettingTab {
                display() {
                    new Setting(this.containerEl).setName("General").setDesc("Applies everywhere.").setTooltip("All").setDesc("Everywhere").setHeading()
                    new Setting(this.containerEl.createDiv()).setName("General").setHeading()
                }
            }
        `, [{
            plugins: { obsidianmd: { rules: { "no-problematic-settings-headings": rule as never } } },
            rules: { "obsidianmd/no-problematic-settings-headings": "error" },
        }]);
        assert.deepStrictEqual(messages.map((message) => message.suggestions?.map((suggestion) => suggestion.desc)), [
            ["Remove the whole heading setting: the `new Setting(…)` statement and every call in it, including `setDesc()` and `setTooltip()`."],
            ["Remove the whole heading setting: the `new Setting(…)` statement and every call in it."],
        ]);
    });
});
