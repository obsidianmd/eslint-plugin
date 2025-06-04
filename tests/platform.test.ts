import { RuleTester } from '@typescript-eslint/rule-tester';
import platformRule from '../lib/rules/platform.js';

const ruleTester = new RuleTester();

ruleTester.run('platform', platformRule, {
    valid: [
        { code: 'const foo = 1;' }
    ],
    invalid: [
        { code: 'navigator.userAgent;', errors: [{ messageId: 'avoidNavigator' }] },
    ],
});
