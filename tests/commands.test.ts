import { RuleTester } from 'eslint';
import commandsRule from '../lib/rules/commands.js';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester();
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };

ruleTester.run('commands', commandsRule, {
    valid: [
        { code: 'app.commands.addCommand({ id: "foo", name: "bar" });', languageOptions }
    ],
    invalid: [
        { code: 'app.commands.addCommand({ id: "command-foo", name: "bar" });', errors: [{ messageId: 'commandInId' }], languageOptions },
    ],
});
