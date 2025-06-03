import './setupRuleTester.js';
import { RuleTester } from '@typescript-eslint/rule-tester';
import hardcodedConfigPathRule from '../lib/rules/hardcodedConfigPath.js';
import parser from '@typescript-eslint/parser';

// NOTE: Type-aware linting is skipped due to lack of support in ESLint v9+ and @typescript-eslint/rule-tester as of June 2025.
const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

ruleTester.run('hardcoded-config-path', hardcodedConfigPathRule, {
    valid: [
        { code: 'const config = ".config";' }
    ],
    invalid: [
        { code: 'const config = ".obsidian";', errors: [{ messageId: 'configPath' }] },
    ],
});
