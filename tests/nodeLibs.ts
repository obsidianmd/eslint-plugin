import { RuleTester } from 'eslint';
import platformRule from '../lib/rules/platform.js';
const parser = (await import('@typescript-eslint/parser')).default;
const ruleTester = new RuleTester({
    parser,
    parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});
const patchedPlatformRule = {
    ...platformRule,
    meta: {
        ...platformRule.meta,
        type: 'problem', // Ensure this is a valid value
    },
};
ruleTester.run('platform', patchedPlatformRule as any, {
    valid: ['import {issues} from "./reviewIssues";'],
    invalid: [
        {
            code: 'import {promises as fsPromises} from "fs";',
            errors: [{ messageId: 'desktopOnly' }],
        },
        {
            code: 'import path from "path";',
            errors: [{ messageId: 'desktopOnly' }],
        },
    ],
});

