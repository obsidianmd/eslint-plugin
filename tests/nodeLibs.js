import { RuleTester } from 'eslint';
import { nodeLibs } from '../lib/rules/nodeLibs.js';

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

ruleTester.run('my-rule', nodeLibs, {
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
