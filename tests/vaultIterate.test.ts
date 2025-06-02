import { RuleTester } from 'eslint';
import vaultIterateRule from '../lib/rules/vault/iterate.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('vault-iterate', vaultIterateRule, {
    valid: [
        { code: 'vault.getFiles().find(f => f.size > 100);', languageOptions }
    ],
    invalid: [
        { code: 'vault.getFiles().find(f => f.path === "foo");', errors: [{ messageId: 'iterate' }], languageOptions },
    ],
});
