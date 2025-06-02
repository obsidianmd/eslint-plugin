import { RuleTester } from 'eslint';
const objectAssignRule = (await import('../lib/rules/objectAssign.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('object-assign', objectAssignRule as any, {
    valid: [
        { code: 'Object.assign({}, {foo: 1}, {bar: 2});', languageOptions } as any
    ],
    invalid: [
        { code: 'Object.assign(defaultConfig, config);', errors: [{ messageId: 'twoArgumentsDefault' }], languageOptions } as any,
    ],
});
