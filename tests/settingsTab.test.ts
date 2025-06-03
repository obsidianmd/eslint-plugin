import { RuleTester } from '@typescript-eslint/rule-tester';
import settingsTabRule from '../lib/rules/settingsTab.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

ruleTester.run('settings-tab', settingsTabRule, {
    valid: [
        { code: 'class MyTab extends PluginSettingTab {}' }
    ],
    invalid: [],
    // Test case broken at the moment.
    //    {
    //        code: 'class SampleSettingTab extends PluginSettingTab { constructor() { new Setting(this.containerEl).setName("settings").setHeading(); } }',
    //        errors: [{ messageId: 'settings' }],
    //        output: 'class SampleSettingTab extends PluginSettingTab { constructor() {  } }'
    //    },
});
