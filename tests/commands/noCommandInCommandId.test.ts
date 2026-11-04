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
            name: "'command' inside a longer word is allowed",
            code: "plugin.addCommand({ id: 'open-commander' }); plugin.addCommand({ id: 'recommend-notes' }); plugin.addCommand({ id: 'commandeerTab' });",
        },
        {
            name: "the plural 'commands' is allowed",
            code: "plugin.addCommand({ id: 'list-commands' });",
        },
        {
            name: "id from a template literal is not checked",
            code: "this.addCommand({ id: `open-command` });",
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { id: 'open-command' }; this.addCommand(command);",
        },
        {
            name: "a computed key that is a variable is not the id",
            code: "this.addCommand({ [id]: 'open-command' });",
        },
        {
            name: "another quoted key is not the id",
            code: "this.addCommand({ 'id': 'open-note', 'name': 'Open command', 'idCommand': 'command' });",
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
            name: "id starting with 'command' in camelCase is forbidden",
            code: "this.addCommand({ id: 'commandPalette' });",
            errors: [{ messageId: "commandInId" }],
        },
        {
            name: "'command' after an acronym is forbidden",
            code: "this.addCommand({ id: 'PDFCommand' });",
            errors: [{ messageId: "commandInId" }],
        },
        {
            name: "'command' between other separators is forbidden",
            code: "this.addCommand({ id: 'run_command' }); this.addCommand({ id: 'editor:COMMAND' }); this.addCommand({ id: 'open.command.now' });",
            errors: [{ messageId: "commandInId" }, { messageId: "commandInId" }, { messageId: "commandInId" }],
        },
        {
            name: "a quoted id key is checked",
            code: "this.addCommand({ \"id\": \"open-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'runCommand' }); this.addCommand({ ['id']: 'command-palette' });",
            errors: [{ messageId: "commandInId" }, { messageId: "commandInId" }, { messageId: "commandInId" }],
        },
    ],
});
