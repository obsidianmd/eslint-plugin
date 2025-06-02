import { RuleTester } from 'eslint';
import objectAssignRule from '../lib/rules/objectAssign.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('object-assign', objectAssignRule, {
    valid: [
        { code: 'Object.assign({}, {foo: 1}, {bar: 2});', languageOptions }
    ],
    invalid: [
        { code: 'Object.assign(defaultConfig, config);', errors: [{ messageId: 'twoArgumentsDefault' }], languageOptions },
    ],
});
