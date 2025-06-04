// /workspaces/eslint-plugin/tests/setupRuleTester.ts
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';

declare global {
    // Extend NodeJS.Global with afterAll for type safety
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface Global {
            afterAll?: () => void;
        }
    }
}

// Patch for @typescript-eslint/rule-tester: define global afterAll if missing
if (typeof (global as NodeJS.Global).afterAll !== 'function') {
    (global as NodeJS.Global).afterAll = () => {};
}

RuleTester.afterAll = () => {}; // Or your test runner's equivalent if needed
RuleTester.describe = (text, fn) => fn(); // Or your test runner's describe
RuleTester.it = (text, fn) => fn(); // Or your test runner's it

// Set up RuleTester to use @typescript-eslint/parser globally
RuleTester.setDefaultConfig({
    languageOptions: {
        parser, // Use the TypeScript parser
        // ecmaVersion and sourceType are often inferred when 'project' is set,
        // but explicitly setting them can be good practice.
        // Ensure they match your project's needs (e.g., from tsconfig.json).
        ecmaVersion: 2022, // Or your project's target ECMAScript version
        sourceType: 'module', // Since your package.json has "type": "module"
        parserOptions: {
            project: './tsconfig.json', // Point to your main tsconfig.json
            tsconfigRootDir: process.cwd(), // Root directory for resolving tsconfig.json
        }
    },
});