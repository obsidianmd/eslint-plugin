import { RuleTester } from 'eslint';
import platformRule from '../lib/rules/platform.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('platform', platformRule, {
    valid: [
        { code: 'const foo = 1;', languageOptions }
    ],
    invalid: [
        { code: 'navigator.userAgent;', errors: [{ messageId: 'avoidNavigator' }], languageOptions },
    ],
});
