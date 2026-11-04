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
        {
            name: "a computed key that is a variable is not the name",
            code: "this.addCommand({ [name]: 'Run command' });",
        },
        {
            name: "another quoted key is not the name",
            code: "this.addCommand({ 'id': 'run-command', 'name': 'Run', 'names': 'Run command' });",
        },
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ name: 'Run command' }); addCommand({ name: 'Run command' }); class A { #addCommand(o: object) {} run() { this.#addCommand({ name: 'Run command' }); } }",
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ name: 'Run command' }));",
        },
        {
            name: "a name that is not a string is not checked",
            code: "this.addCommand({ name: 1 }); this.addCommand({ name: null }); this.addCommand({ name: /Run command/ });",
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { name: 'Run command' }; this.addCommand(command);",
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
        {
            name: "a quoted name key is checked",
            code: "this.addCommand({ \"id\": \"run\", \"name\": \"Run command\" }); this.addCommand({ 'name': 'Command: run' }); this.addCommand({ ['name']: 'Run command' });",
            errors: [{ messageId: "commandInName" }, { messageId: "commandInName" }, { messageId: "commandInName" }],
        },
        {
            name: "a spread in the command object is skipped, and the name still checked",
            code: "this.addCommand({ ...base, name: 'Run command' });",
            errors: [{ messageId: "commandInName", line: 1, column: 28, endLine: 1, endColumn: 47 }],
        },
    ],
});
