import './setupRuleTester.js';
import { RuleTester } from '@typescript-eslint/rule-tester';
import vaultIterateRule from '../lib/rules/vault/iterate.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        parserOptions: { project: './tsconfig.test.json' },
        ecmaVersion: 2020,
        sourceType: 'module',
    }
});

ruleTester.run('vault-iterate', vaultIterateRule, {
    valid: [
        { code: 'vault.getFiles().find(f => f.size > 100);' }
    ],
    invalid: [
        { code: 'vault.getFiles().find(f => f.path === "foo");', errors: [{ messageId: 'iterate' }] },
    ],
});
