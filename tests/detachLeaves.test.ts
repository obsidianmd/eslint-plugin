import { RuleTester } from 'eslint';
import detachLeavesRule from '../lib/rules/detachLeaves.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('detach-leaves', detachLeavesRule, {
    valid: [
        { code: 'class MyPlugin { onunload() { /* nothing */ } }', languageOptions }
    ],
    invalid: [
        {
            code: 'class MyPlugin { onunload() { this.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: 'onunload' }],
            output: 'class MyPlugin { onunload() {  } }',
            languageOptions
        },
    ],
});
