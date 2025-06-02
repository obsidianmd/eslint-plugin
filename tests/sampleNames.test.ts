import { RuleTester } from 'eslint';
import sampleNamesRule from '../lib/rules/sampleNames.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('sample-names', sampleNamesRule, {
    valid: [
        { code: 'class NotSample {}', languageOptions }
    ],
    invalid: [
        { code: 'class MyPlugin {}', errors: [{ messageId: 'rename' }], languageOptions },
    ],
});
