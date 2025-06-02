import { RuleTester } from 'eslint';
const sampleNamesRule = (await import('../lib/rules/sampleNames.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('sample-names', sampleNamesRule as any, {
    valid: [
        { code: 'class NotSample {}', languageOptions } as any
    ],
    invalid: [
        { code: 'class MyPlugin {}', errors: [{ messageId: 'rename' }], languageOptions } as any,
    ],
});
