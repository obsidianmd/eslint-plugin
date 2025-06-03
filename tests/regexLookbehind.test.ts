import { RuleTester } from '@typescript-eslint/rule-tester';
import regexLookbehindRule from '../lib/rules/regexLookbehind.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

ruleTester.run('regex-lookbehind', regexLookbehindRule, {
    valid: [
        { code: 'const re = /foo/;' }
    ],
    invalid: [
        { code: 'const re = /(?<=foo)bar/;', errors: [{ messageId: 'lookbehind' }] },
    ],
});
