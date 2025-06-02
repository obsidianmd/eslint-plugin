import { RuleTester } from 'eslint';
const commandsRule = (await import('../lib/rules/commands.js')).default;
const ruleTester = new RuleTester();
const parser = (await import('@typescript-eslint/parser')).default;
const languageOptions = { parser, ecmaVersion: 2020, sourceType: 'module' };
ruleTester.run('commands', commandsRule as any, {
    valid: [
        { code: 'app.commands.addCommand({ id: "foo", name: "bar" });', languageOptions } as any
    ],
    invalid: [
        { code: 'app.commands.addCommand({ id: "command-foo", name: "bar" });', errors: [{ messageId: 'commandInId' }], languageOptions } as any,
    ],
});
