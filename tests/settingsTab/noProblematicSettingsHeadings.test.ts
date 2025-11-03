import { RuleTester } from "@typescript-eslint/rule-tester";
import { manifest } from "../../lib/readManifest.js";

const MOCK_CLASS = `
    declare class Setting { setName(name: string): this; setHeading(): this; }
    declare class PluginSettingTab { containerEl: HTMLElement; }
`;

// Use an async IIFE to mock the manifest and dynamically import the rule
(async () => {
	const originalName = manifest.name;
	try {
		manifest.name = "My Awesome Plugin";

		const { default: rule } = await import(
			"../../lib/rules/settingsTab/noProblematicSettingsHeadings.js"
		);
		const ruleTester = new RuleTester();

		ruleTester.run("no-problematic-settings-headings", rule, {
			valid: [
				{
					code: `
                        ${MOCK_CLASS}
                        class MyTab extends PluginSettingTab {
                            display() {
                                new Setting(this.containerEl).setName("My Section").setHeading();
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
                                new Setting(this.containerEl).setName("Plugin Settings").setHeading();
                            }
                        }
                    `,
					errors: [{ messageId: "settings" }],
				},
				{
					code: `
                        ${MOCK_CLASS}
                        class MyTab extends PluginSettingTab {
                            display() {
                                new Setting(this.containerEl).setName("General Options").setHeading();
                            }
                        }
                    `,
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
					code: `
						${MOCK_CLASS}
						class MyTab extends PluginSettingTab {
							display() {
								new Setting(this.containerEl).setName("General").setHeading();
							}
						}
					`,
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
					code: `
                        ${MOCK_CLASS}
                        class MyTab extends PluginSettingTab {
                            display() {
                                new Setting(this.containerEl).setName("My Awesome Plugin Configuration").setHeading();
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
	} finally {
		manifest.name = originalName;
	}
})();
