import { RuleTester } from '@typescript-eslint/rule-tester';
import { nodeLibs } from '../lib/rules/nodeLibs';
const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser'
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
