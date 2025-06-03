import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';

// Patch for @typescript-eslint/rule-tester: define global afterAll if missing
if (typeof global.afterAll !== 'function') {
    global.afterAll = () => {};
}

RuleTester.afterAll = () => {};
RuleTester.describe = (text, fn) => fn();
RuleTester.it = (text, fn) => fn();

// Set up RuleTester to use @typescript-eslint/parser globally (flat config style)
RuleTester.setDefaultConfig({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});
