import { RuleTester } from "@typescript-eslint/rule-tester";
import noManualHeadingsRule from "../../lib/rules/settingsTab/noManualHtmlHeadings.js";

const MOCK_CLASS = `
    declare class Setting { constructor(el: any); setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: { createEl(tag: string, options?: any): HTMLElement; }; }
`;

const ruleTester = new RuleTester();

ruleTester.run("no-manual-html-headings", noManualHeadingsRule, {
	valid: [
		{
			code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {
                        this.containerEl.createEl("div");
                    }
                }
            `,
		},
	],
	invalid: [
		{
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
	],
});
