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
            name: "'command' as part of larger word is allowed",
            code: "this.addCommand({ name: 'Accommodate the user' });",
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
    ],
});
