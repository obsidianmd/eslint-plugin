import './setupRuleTester.js';
import { RuleTester } from '@typescript-eslint/rule-tester';
import hardcodedConfigPathRule from '../lib/rules/hardcodedConfigPath.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        parserOptions: { project: './tsconfig.test.json' },
        ecmaVersion: 2020,
        sourceType: 'module',
    }
});

ruleTester.run('hardcoded-config-path', hardcodedConfigPathRule, {
    valid: [
        { code: 'const config = ".config";' }
    ],
    invalid: [
        { code: 'const config = ".obsidian";', errors: [{ messageId: 'configPath' }] },
    ],
});
