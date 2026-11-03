import { RuleTester } from "@typescript-eslint/rule-tester";
import noCommandInIdRule from "../../lib/rules/commands/noCommandInCommandId.js";

const ruleTester = new RuleTester();

ruleTester.run("no-command-in-command-id", noCommandInIdRule, {
    valid: [
        {
            name: "id without 'command' is allowed",
            code: "this.addCommand({ id: 'open-thing' });",
        },
        {
            name: "id from a template literal is not checked",
            code: "this.addCommand({ id: `open-command` });",
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { id: 'open-command' }; this.addCommand(command);",
        },
    ],
    invalid: [
        {
            name: "id ending with '-command' is forbidden",
            code: "this.addCommand({ id: 'open-thing-command' });",
            errors: [{ messageId: "commandInId" }],
        },
        {
            name: "id containing 'Command' (camelCase) is forbidden",
            code: "this.addCommand({ id: 'myCommand' });",
            errors: [{ messageId: "commandInId" }],
        },
        {
            name: "'command' inside a longer word is forbidden",
            code: "plugin.addCommand({ id: 'open-commander' });",
            errors: [{ messageId: "commandInId" }],
        },
    ],
});
