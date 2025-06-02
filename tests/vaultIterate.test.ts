import { RuleTester } from 'eslint';
const vaultIterateRule = (await import('../lib/rules/vault/iterate.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('vault-iterate', vaultIterateRule as any, {
    valid: [
        { code: 'vault.getFiles().find(f => f.size > 100);', languageOptions } as any
    ],
    invalid: [
        { code: 'vault.getFiles().find(f => f.path === "foo");', errors: [{ messageId: 'iterate' }], languageOptions } as any,
    ],
});
