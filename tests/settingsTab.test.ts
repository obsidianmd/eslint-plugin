import { RuleTester } from 'eslint';
const settingsTabRule = (await import('../lib/rules/settingsTab.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('settings-tab', settingsTabRule as any, {
    valid: [
        { code: 'class MyTab extends PluginSettingTab {}', languageOptions } as any
    ],
    invalid: [
        { code: 'class SampleSettingTab extends PluginSettingTab { constructor() { new Setting(this.containerEl).setName("settings").setHeading(); } }', errors: [{ messageId: 'settings' }], languageOptions } as any,
    ],
});
