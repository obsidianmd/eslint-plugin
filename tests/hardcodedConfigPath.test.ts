import { RuleTester } from 'eslint';
const hardcodedConfigPathRule = (await import('../lib/rules/hardcodedConfigPath.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('hardcoded-config-path', hardcodedConfigPathRule as any, {
    valid: [
        { code: 'const config = ".config";', languageOptions } as any
    ],
    invalid: [
        { code: 'const config = ".obsidian";', errors: [{ messageId: 'configPath' }], languageOptions } as any,
    ],
});
