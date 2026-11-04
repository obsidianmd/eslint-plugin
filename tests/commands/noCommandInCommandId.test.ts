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
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ id: 'open-command' }); addCommand({ id: 'open-command' }); class A { #addCommand(o: object) {} run() { this.#addCommand({ id: 'open-command' }); } }",
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ id: 'open-command' }));",
        },
        {
            name: "a id that is not a string is not checked",
            code: "this.addCommand({ id: 1 }); this.addCommand({ id: null }); this.addCommand({ id: /open-command/ });",
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
        {
            name: "a spread in the command object is skipped, and the id still checked",
            code: "this.addCommand({ ...base, id: 'open-command' });",
            errors: [{ messageId: "commandInId", line: 1, column: 28, endLine: 1, endColumn: 46 }],
        },
    ],
});
