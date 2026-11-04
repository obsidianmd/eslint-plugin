import { RuleTester } from "@typescript-eslint/rule-tester";
import noManualHeadingsRule from "../../lib/rules/settingsTab/noManualHtmlHeadings.js";

const MOCK_CLASS = `
    declare class Setting { constructor(el: unknown); setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: { createEl(tag: string, options?: unknown): HTMLElement; }; }
`;

// A settings tab using Obsidian's own declarations, `display()` holding `body`.
function obsidianTab(body: string, imports = "PluginSettingTab, Setting"): string {
    return `
        import { ${imports} } from "obsidian";
        class MyTab extends PluginSettingTab {
            display(): void {
                const { containerEl } = this;
                ${body}
            }
        }
    `;
}

const ruleTester = new RuleTester();

ruleTester.run("no-manual-html-headings", noManualHeadingsRule, {
    valid: [
        {
            name: "createEl('div') is allowed",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("div");
                    }
                }
            `,
        },
        {
            name: "a heading created outside a settings tab is allowed",
            code: `
                declare const el: { createEl(tag: string, options?: unknown): HTMLElement };
                el.createEl("h2", { text: "Title" });
            `,
        },
        // The nearest enclosing class decides whether a heading is in a settings tab.
        {
            name: "a heading in a class nested in a settings tab is not checked",
            code: obsidianTab(`
                class Renderer {
                    render(el: HTMLElement): void {
                        el.createEl("h2", { text: "Title" });
                    }
                }
                const View = class {
                    render(el: HTMLElement): void {
                        el.createEl("h3", { text: "Title" });
                    }
                };`),
        },
        {
            name: "a heading after a settings tab nested in another class is not checked",
            code: `
                import { PluginSettingTab } from "obsidian";
                class Plugin {
                    load(el: HTMLElement): void {
                        class MyTab extends PluginSettingTab {
                            display(): void {}
                        }
                        el.createEl("h2", { text: "Title" });
                    }
                }
            `,
        },
        {
            name: "a heading in a class expression that does not extend PluginSettingTab is not checked",
            code: `
                import { Modal } from "obsidian";
                const MyModal = class extends Modal {
                    onOpen(): void {
                        this.contentEl.createEl("h2", { text: "Title" });
                    }
                };
            `,
        },
    ],
    invalid: [
        {
            name: "createEl('h2') is forbidden and auto-fixed to Setting",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("h2", { text: "My Heading" });
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("My Heading").setHeading();
                    }
                }
            `,
        },
        {
            name: "createEl('h3') with destructured containerEl is forbidden",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        const { containerEl } = this;
                        containerEl.createEl("h3", { text: "Another Heading" });
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        const { containerEl } = this;
                        new Setting(containerEl).setName("Another Heading").setHeading();
                    }
                }
            `,
        },
        {
            name: "h1 to h6 are all reported",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("h1");
                        this.containerEl.createEl("h6");
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }, { messageId: "headingEl" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("").setHeading();
                        new Setting(this.containerEl).setName("").setHeading();
                    }
                }
            `,
        },
        {
            name: "options other than text are not carried over, so the rewrite is a suggestion",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("h4", { text: "Advanced", cls: "my-heading" });
                    }
                }
            `,
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("Advanced").setHeading();
                    }
                }
            `,
                }],
            }],
        },
        // Patterns from the community-plugin run, with Obsidian's declarations.
        {
            name: "quotes in the text are kept as written (obsidian-contacts)",
            code: obsidianTab(`containerEl.createEl("h2", { text: 'Settings for "Contacts" plugin.' });`),
            output: obsidianTab(`new Setting(containerEl).setName('Settings for "Contacts" plugin.').setHeading();`),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a string-typed text expression is kept (telegram-sync, daily-task-auto-generator)",
            code: `
                declare function t(key: string): string;
                declare const version: string;
                ${obsidianTab(`
                containerEl.createEl("h3", { text: t("settings.template") });
                containerEl.createEl("h1", { text: \`Telegram Sync \${version}\` });
                containerEl.createEl("h2", { text: "Settings for " + version });`)}
            `,
            output: `
                declare function t(key: string): string;
                declare const version: string;
                ${obsidianTab(`
                new Setting(containerEl).setName(t("settings.template")).setHeading();
                new Setting(containerEl).setName(\`Telegram Sync \${version}\`).setHeading();
                new Setting(containerEl).setName("Settings for " + version).setHeading();`)}
            `,
            errors: [{ messageId: "headingEl" }, { messageId: "headingEl" }, { messageId: "headingEl" }],
        },
        {
            name: "text that may be undefined does not fit setName(), so there is no fix",
            code: `
                declare const label: string | undefined;
                ${obsidianTab(`containerEl.createEl("h3", { text: label });`)}
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "a heading whose text is set with setText() is fixed (color-palette, bellboy)",
            code: obsidianTab(`containerEl.createEl("h2").setText("Defaults");`),
            output: obsidianTab(`new Setting(containerEl).setName("Defaults").setHeading();`),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a heading kept in a variable that is used has no fix (findoc, mermaid-popup)",
            code: obsidianTab(`
                const modelsHeader = containerEl.createEl("h3");
                modelsHeader.innerText = "Models";
                const title = containerEl.createEl("h2", { text: "Zoom ratio" });
                title.classList.add("config-text");`),
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }, { messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "a heading whose return value is used in a chain has no fix",
            code: obsidianTab(`containerEl.createEl("h2", { text: "Usage tips" }).addClass("help-heading");`),
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "a heading passed on has no fix (links)",
            code: `
                declare function setHelpLink(el: Element): void;
                ${obsidianTab(`setHelpLink(containerEl.createEl("h4", { text: "Set link text" }));`)}
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "a heading in a variable that is never read gets a suggestion",
            code: obsidianTab(`const heading = containerEl.createEl("h1", { text: "Advanced" });`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`const heading = new Setting(containerEl).setName("Advanced").setHeading();`),
                }],
            }],
        },
        {
            name: "an attr option is not carried over, so the rewrite is a suggestion (linear-calendar)",
            code: obsidianTab(`containerEl.createEl("h4", { text: "Start date", attr: { style: "margin-top: 0;" } });`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`new Setting(containerEl).setName("Start date").setHeading();`),
                }],
            }],
        },
        {
            name: "a callback is not carried over, so the rewrite is a suggestion",
            code: obsidianTab(`containerEl.createEl("h4", { text: "Start date" }, (el) => el.addClass("x"));`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`new Setting(containerEl).setName("Start date").setHeading();`),
                }],
            }],
        },
        {
            name: "options that are not an object literal leave the text unknown, so there is no fix",
            code: `
                declare const options: DomElementInfo;
                ${obsidianTab(`containerEl.createEl("h4", options);`)}
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "a heading in a document fragment has no fix (obsidian-book-search-plugin)",
            code: obsidianTab(`
                const header = document.createDocumentFragment();
                header.createEl("h2", { text: "Title" });`),
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "any HTML element can hold the Setting",
            code: obsidianTab(`
                const section = containerEl.createDiv();
                section.createEl("h4", { text: "Display" });`),
            output: obsidianTab(`
                const section = containerEl.createDiv();
                new Setting(section).setName("Display").setHeading();`),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "Setting is added to the import from obsidian when it is missing (minitabs, laws-of-form)",
            code: obsidianTab(`
                containerEl.createEl("h3", { text: "Parser" });
                containerEl.createEl("h3", { text: "Style" });`, "type App, PluginSettingTab"),
            output: [
                obsidianTab(`
                new Setting(containerEl).setName("Parser").setHeading();
                containerEl.createEl("h3", { text: "Style" });`, "type App, PluginSettingTab, Setting"),
                obsidianTab(`
                new Setting(containerEl).setName("Parser").setHeading();
                new Setting(containerEl).setName("Style").setHeading();`, "type App, PluginSettingTab, Setting"),
            ],
            errors: [{ messageId: "headingEl" }, { messageId: "headingEl" }],
        },
        {
            name: "a type-only import of Setting cannot be constructed, so there is no fix",
            code: `
                import type { Setting } from "obsidian";
                ${obsidianTab(`containerEl.createEl("h3", { text: "Parser" });`, "PluginSettingTab")}
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        {
            name: "without a named import from obsidian to add Setting to, there is no fix",
            code: `
                import * as obsidian from "obsidian";
                declare class PluginSettingTab extends obsidian.PluginSettingTab {}
                class MyTab extends PluginSettingTab {
                    display(): void {
                        this.containerEl.createEl("h3", { text: "Parser" });
                    }
                }
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
        // A class nested in the tab used to end the check for the rest of the tab.
        {
            name: "a heading after a class nested in the tab is reported",
            code: obsidianTab(`
                class Inner {}
                containerEl.createEl("h2", { text: "Advanced" });`),
            output: obsidianTab(`
                class Inner {}
                new Setting(containerEl).setName("Advanced").setHeading();`),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a heading in a method after one holding a class expression is reported",
            code: `
                import { PluginSettingTab, Setting } from "obsidian";
                class MyTab extends PluginSettingTab {
                    renderer = class {};
                    display(): void {
                        this.containerEl.createEl("h2", { text: "Advanced" });
                    }
                }
            `,
            output: `
                import { PluginSettingTab, Setting } from "obsidian";
                class MyTab extends PluginSettingTab {
                    renderer = class {};
                    display(): void {
                        new Setting(this.containerEl).setName("Advanced").setHeading();
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a heading in a callback or a nested function of the tab is reported",
            code: obsidianTab(`
                class Inner {}
                [1].forEach(() => { containerEl.createEl("h3", { text: "Sync" }); });
                function renderSection(el: HTMLElement): void { el.createEl("h3", { text: "Sync" }); }`),
            output: obsidianTab(`
                class Inner {}
                [1].forEach(() => { new Setting(containerEl).setName("Sync").setHeading(); });
                function renderSection(el: HTMLElement): void { new Setting(el).setName("Sync").setHeading(); }`),
            errors: [{ messageId: "headingEl" }, { messageId: "headingEl" }],
        },
        {
            name: "a settings tab written as a class expression is checked",
            code: `
                import { PluginSettingTab, Setting } from "obsidian";
                export const MyTab = class extends PluginSettingTab {
                    display(): void {
                        this.containerEl.createEl("h2", { text: "Advanced" });
                    }
                };
            `,
            output: `
                import { PluginSettingTab, Setting } from "obsidian";
                export const MyTab = class extends PluginSettingTab {
                    display(): void {
                        new Setting(this.containerEl).setName("Advanced").setHeading();
                    }
                };
            `,
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a settings tab nested in another class is checked",
            code: `
                import { PluginSettingTab, Setting } from "obsidian";
                class Plugin {
                    makeTab() {
                        return class extends PluginSettingTab {
                            display(): void {
                                this.containerEl.createEl("h2", { text: "Advanced" });
                            }
                        };
                    }
                }
            `,
            output: `
                import { PluginSettingTab, Setting } from "obsidian";
                class Plugin {
                    makeTab() {
                        return class extends PluginSettingTab {
                            display(): void {
                                new Setting(this.containerEl).setName("Advanced").setHeading();
                            }
                        };
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a Setting without setHeading() (older Obsidian typings) has no fix",
            code: `
                declare class Setting { constructor(el: HTMLElement); setName(name: string): this; }
                declare class PluginSettingTab { containerEl: HTMLElement; }
                class MyTab extends PluginSettingTab {
                    display(): void {
                        this.containerEl.createEl("h3", { text: "Parser" });
                    }
                }
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
    ],
});

// Without type information the fix needs the parent element and the text to be
// evident from the syntax. Otherwise it is a suggestion.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("no-manual-html-headings without type information", noManualHeadingsRule, {
    valid: [],
    invalid: [
        {
            name: "this.containerEl and a binding taken from it are fixed",
            code: obsidianTab(`
                containerEl.createEl("h2", { text: "General" });
                this.containerEl.createEl("h2", { text: "Advanced" });
                const sync = () => this.containerEl.createEl("h3", { text: "Sync" }) && 0;
                [1].forEach(() => { this.containerEl.createEl("h3", { text: "Sync" }); });`),
            output: obsidianTab(`
                new Setting(containerEl).setName("General").setHeading();
                new Setting(this.containerEl).setName("Advanced").setHeading();
                const sync = () => this.containerEl.createEl("h3", { text: "Sync" }) && 0;
                [1].forEach(() => { new Setting(this.containerEl).setName("Sync").setHeading(); });`),
            errors: [
                { messageId: "headingEl" },
                { messageId: "headingEl" },
                { messageId: "headingEl", suggestions: [] },
                { messageId: "headingEl" },
            ],
        },
        {
            name: "this.containerEl of a settings tab written as a class expression is fixed",
            code: `
                import { PluginSettingTab, Setting } from "obsidian";
                const MyTab = class extends PluginSettingTab {
                    display() {
                        class Inner {}
                        this.containerEl.createEl("h2", { text: "Advanced" });
                    }
                };
            `,
            output: `
                import { PluginSettingTab, Setting } from "obsidian";
                const MyTab = class extends PluginSettingTab {
                    display() {
                        class Inner {}
                        new Setting(this.containerEl).setName("Advanced").setHeading();
                    }
                };
            `,
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "a parameter typed as an HTML element is fixed, its string-typed text too",
            code: `
                import { PluginSettingTab, Setting } from "obsidian";
                class MyTab extends PluginSettingTab {
                    renderSection(containerEl: HTMLElement, title: string): void {
                        containerEl.createEl("h3", { text: title });
                    }
                }
            `,
            output: `
                import { PluginSettingTab, Setting } from "obsidian";
                class MyTab extends PluginSettingTab {
                    renderSection(containerEl: HTMLElement, title: string): void {
                        new Setting(containerEl).setName(title).setHeading();
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "an element of unknown type gets a suggestion",
            code: obsidianTab(`
                const section = containerEl.createDiv();
                section.createEl("h4", { text: "Display" });`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`
                const section = containerEl.createDiv();
                new Setting(section).setName("Display").setHeading();`),
                }],
            }],
        },
        {
            name: "this in a nested function is not the tab, so it gets a suggestion",
            code: obsidianTab(`
                [1].forEach(function () { this.containerEl.createEl("h4", { text: "Display" }); });`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`
                [1].forEach(function () { new Setting(this.containerEl).setName("Display").setHeading(); });`),
                }],
            }],
        },
        {
            name: "text of unknown type gets a suggestion",
            code: obsidianTab(`containerEl.createEl("h3", { text: t("settings.template") });`),
            output: null,
            errors: [{
                messageId: "headingEl",
                suggestions: [{
                    messageId: "replaceWithSettingHeading",
                    output: obsidianTab(`new Setting(containerEl).setName(t("settings.template")).setHeading();`),
                }],
            }],
        },
        {
            name: "the setText() argument is a valid name whatever its type",
            code: obsidianTab(`containerEl.createEl("h1").setText(t("settings.title"));`),
            output: obsidianTab(`new Setting(containerEl).setName(t("settings.title")).setHeading();`),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "Setting is added to the import from obsidian",
            code: obsidianTab(`containerEl.createEl("h2", { text: "Settings" });`, "App, PluginSettingTab,"),
            output: obsidianTab(`new Setting(containerEl).setName("Settings").setHeading();`, "App, PluginSettingTab, Setting,"),
            errors: [{ messageId: "headingEl" }],
        },
        {
            name: "without an import from obsidian to add Setting to, there is no fix",
            code: `
                const { PluginSettingTab } = require("obsidian");
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("h2", { text: "Settings" });
                    }
                }
            `,
            output: null,
            errors: [{ messageId: "headingEl", suggestions: [] }],
        },
    ],
});
