import { RuleTester } from 'eslint';
const regexLookbehindRule = (await import('../lib/rules/regexLookbehind.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('regex-lookbehind', regexLookbehindRule as any, {
    valid: [
        { code: 'const re = /foo/;', languageOptions } as any
    ],
    invalid: [
        { code: 'const re = /(?<=foo)bar/;', errors: [{ messageId: 'lookbehind' }], languageOptions } as any,
    ],
});
