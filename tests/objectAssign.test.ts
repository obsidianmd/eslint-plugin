import './setupRuleTester.js';
import { RuleTester } from '@typescript-eslint/rule-tester';
import objectAssignRule from '../lib/rules/objectAssign.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        parserOptions: { project: './tsconfig.test.json' },
        ecmaVersion: 2020,
        sourceType: 'module',
    }
});

ruleTester.run('object-assign', objectAssignRule, {
    valid: [
        { code: 'Object.assign({}, {foo: 1}, {bar: 2});' }
    ],
    invalid: [
        { code: 'Object.assign(defaultConfig, config);', errors: [{ messageId: 'twoArgumentsDefault' }] },
    ],
});
