import { RuleTester } from 'eslint';
import regexLookbehindRule from '../lib/rules/regexLookbehind.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('regex-lookbehind', regexLookbehindRule, {
    valid: [
        { code: 'const re = /foo/;', languageOptions }
    ],
    invalid: [
        { code: 'const re = /(?<=foo)bar/;', errors: [{ messageId: 'lookbehind' }], languageOptions },
    ],
});
