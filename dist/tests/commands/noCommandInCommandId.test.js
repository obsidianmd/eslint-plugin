import { RuleTester } from "@typescript-eslint/rule-tester";
import noCommandInIdRule from "../../lib/rules/commands/noCommandInCommandId.js";
const ruleTester = new RuleTester();
ruleTester.run("no-command-in-command-id", noCommandInIdRule, {
    valid: [
        {
            name: "id without 'command' is allowed",
            code: "this.addCommand({ id: 'open-thing' });",
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
    ],
});
