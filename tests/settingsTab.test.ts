import { RuleTester } from "@typescript-eslint/rule-tester";
import settingsTabRule from "../lib/rules/settingsTab.js";

const ruleTester = new RuleTester();

ruleTester.run("settings-tab", settingsTabRule, {
	valid: [{ code: "class MyTab extends PluginSettingTab {}" }],
	invalid: [
		{
			code: 'class SampleSettingTab extends PluginSettingTab { constructor() { new Setting(this.containerEl).setName("settings").setHeading(); } }',
			errors: [{ messageId: "settings" }],
			output: "class SampleSettingTab extends PluginSettingTab { constructor() {  } }",
		},
	],
});
