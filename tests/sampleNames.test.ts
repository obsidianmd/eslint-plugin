import { RuleTester } from '@typescript-eslint/rule-tester';
import sampleNamesRule from '../lib/rules/sampleNames.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

ruleTester.run('sample-names', sampleNamesRule, {
    valid: [
        { code: 'class NotSample {}' }
    ],
    invalid: [
        { code: 'class MyPlugin {}', errors: [{ messageId: 'rename' }] },
    ],
});
