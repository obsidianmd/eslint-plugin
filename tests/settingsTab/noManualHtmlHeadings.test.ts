import { RuleTester } from "@typescript-eslint/rule-tester";
import noManualHeadingsRule from "../../lib/rules/settingsTab/noManualHtmlHeadings.js";

const MOCK_CLASS = `
    declare class Setting { constructor(el: unknown); setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: { createEl(tag: string, options?: unknown): HTMLElement; }; }
`;

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
            name: "the fix keeps only the text option",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("h4", { text: "Advanced", cls: "my-heading" });
                    }
                }
            `,
            errors: [{ messageId: "headingEl" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        new Setting(this.containerEl).setName("Advanced").setHeading();
                    }
                }
            `,
        },
    ],
});
