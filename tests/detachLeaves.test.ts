import { RuleTester } from 'eslint';
const detachLeavesRule = (await import('../lib/rules/detachLeaves.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('detach-leaves', detachLeavesRule as any, {
    valid: [
        { code: 'class MyPlugin { onunload() { /* nothing */ } }', languageOptions } as any
    ],
    invalid: [
        { code: 'class MyPlugin { onunload() { this.detachLeavesOfType("foo"); } }', errors: [{ messageId: 'onunload' }], languageOptions } as any,
    ],
});
