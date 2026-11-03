import { RuleTester } from "@typescript-eslint/rule-tester";
import noCommandInNameRule from "../../lib/rules/commands/noCommandInCommandName.js";

const ruleTester = new RuleTester();

ruleTester.run("no-command-in-command-name", noCommandInNameRule, {
    valid: [
        {
            name: "name without 'command' is allowed",
            code: "this.addCommand({ name: 'Open a new note' });",
        },
        {
            name: "a word that only resembles 'command' is allowed",
            code: "this.addCommand({ name: 'Accommodate the user' });",
        },
        {
            name: "'command' inside a longer word is allowed",
            code: "this.addCommand({ name: 'Open Commander' }); this.addCommand({ name: 'Recommended settings' });",
        },
        {
            name: "the plural 'commands' is allowed",
            code: "this.addCommand({ name: 'Show all commands' });",
        },
        {
            // A JavaScript \b would start the word after the "É".
            name: "a letter outside ASCII is part of the word",
            code: "this.addCommand({ name: 'Open Écommand' });",
        },
        {
            name: "name from a template literal is not checked",
            code: "this.addCommand({ name: `Run command` });",
        },
    ],
    invalid: [
        {
            name: "name with standalone 'Command' is forbidden",
            code: "this.addCommand({ name: 'My Awesome Command' });",
            errors: [{ messageId: "commandInName" }],
        },
        {
            name: "name starting with 'command:' is forbidden",
            code: "this.addCommand({ name: 'command: do something' });",
            errors: [{ messageId: "commandInName" }],
        },
        {
            name: "'command' next to punctuation is forbidden",
            code: "this.addCommand({ name: 'Run (command)' }); this.addCommand({ name: 'Open-command' });",
            errors: [{ messageId: "commandInName" }, { messageId: "commandInName" }],
        },
    ],
});
