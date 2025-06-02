import { RuleTester } from 'eslint';
const platformRule = (await import('../lib/rules/platform.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
const patchedPlatformRule = {
    ...platformRule,
    meta: { ...platformRule.meta, type: 'problem' },
};
ruleTester.run('platform', patchedPlatformRule as any, {
    valid: [
        { code: 'import {issues} from "./reviewIssues";', languageOptions } as any
    ],
    invalid: [
        { code: 'import {promises as fsPromises} from "fs";', errors: [{ messageId: 'desktopOnly' }], languageOptions } as any,
        { code: 'import path from "path";', errors: [{ messageId: 'desktopOnly' }], languageOptions } as any,
    ],
});
