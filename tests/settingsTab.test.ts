import { RuleTester } from 'eslint';
import settingsTabRule from '../lib/rules/settingsTab.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('settings-tab', settingsTabRule, {
    valid: [
        { code: 'class MyTab extends PluginSettingTab {}', languageOptions }
    ],
    invalid: [
        {
            code: 'class SampleSettingTab extends PluginSettingTab { constructor() { new Setting(this.containerEl).setName("settings").setHeading(); } }',
            errors: [{ messageId: 'settings' }],
            output: 'class SampleSettingTab extends PluginSettingTab { constructor() {  } }',
            languageOptions
        },
    ],
});
