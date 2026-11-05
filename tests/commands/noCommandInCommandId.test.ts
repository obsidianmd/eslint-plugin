import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import noCommandInIdRule from "../../lib/rules/commands/noCommandInCommandId.js";

const ruleTester = new RuleTester();

// The suggestion that renames a command ID to `id`, giving `output`
const rename = (id: string, output: string) => ({ messageId: "removeCommand" as const, data: { id }, output });
// A command with the ID `id`, in single quotes
const command = (id: string) => `this.addCommand({ id: '${id}' });`;
// One command a line, with the IDs `ids`
const commands = (ids: readonly string[]) => ids.map(command).join("\n");
// The errors for one command a line, with the IDs `ids`, and the suggestion
// to rename each to what `renamed` has for it, or none for null
const renamedLines = (ids: readonly string[], renamed: ReadonlyArray<string | null>) => renamed.map((id, i) => ({
    messageId: "commandInId" as const,
    line: i + 1,
    suggestions: id === null ? [] : [rename(id, commands(ids.map((other, j) => (j === i ? id : other))))],
}));

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
            errors: [{ messageId: "commandInId", suggestions: [rename("open-thing", "this.addCommand({ id: 'open-thing' });")] }],
        },
        {
            name: "id containing 'Command' (camelCase) is forbidden",
            code: "this.addCommand({ id: 'myCommand' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("my", "this.addCommand({ id: 'my' });")] }],
        },
        {
            name: "id starting with 'command' in camelCase is forbidden",
            code: "this.addCommand({ id: 'commandPalette' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("palette", "this.addCommand({ id: 'palette' });")] }],
        },
        {
            name: "'command' after an acronym is forbidden",
            code: "this.addCommand({ id: 'PDFCommand' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("PDF", "this.addCommand({ id: 'PDF' });")] }],
        },
        {
            name: "'command' between other separators is forbidden",
            code: "this.addCommand({ id: 'run_command' }); this.addCommand({ id: 'editor:COMMAND' }); this.addCommand({ id: 'open.command.now' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("run", "this.addCommand({ id: 'run' }); this.addCommand({ id: 'editor:COMMAND' }); this.addCommand({ id: 'open.command.now' });")] },
                { messageId: "commandInId", suggestions: [rename("editor", "this.addCommand({ id: 'run_command' }); this.addCommand({ id: 'editor' }); this.addCommand({ id: 'open.command.now' });")] },
                { messageId: "commandInId", suggestions: [rename("open.now", "this.addCommand({ id: 'run_command' }); this.addCommand({ id: 'editor:COMMAND' }); this.addCommand({ id: 'open.now' });")] },
            ],
        },
        {
            name: "a quoted id key is checked",
            code: "this.addCommand({ \"id\": \"open-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'runCommand' }); this.addCommand({ ['id']: 'command-palette' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("open", "this.addCommand({ \"id\": \"open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'runCommand' }); this.addCommand({ ['id']: 'command-palette' });")] },
                { messageId: "commandInId", suggestions: [rename("run", "this.addCommand({ \"id\": \"open-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'run' }); this.addCommand({ ['id']: 'command-palette' });")] },
                { messageId: "commandInId", suggestions: [rename("palette", "this.addCommand({ \"id\": \"open-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'runCommand' }); this.addCommand({ ['id']: 'palette' });")] },
            ],
        },
        {
            name: "a spread in the command object is skipped, and the id still checked",
            code: "this.addCommand({ ...base, id: 'open-command' });",
            errors: [{
                messageId: "commandInId",
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 46,
                suggestions: [rename("open", "this.addCommand({ ...base, id: 'open' });")],
            }],
        },
        {
            name: "the suggestion removes 'command' every time, and keeps a camelCase ID camelCase",
            code: commands(["command-run-command", "runCommandNow", "run-commandNow", "CommandPalette", "openCommandPDF"]),
            errors: renamedLines(
                ["command-run-command", "runCommandNow", "run-commandNow", "CommandPalette", "openCommandPDF"],
                ["run", "runNow", "run-now", "Palette", "openPDF"],
            ),
        },
        {
            name: "the suggestion keeps the quotes and the escapes",
            code: "this.addCommand({ id: \"run\\u002Dcommand\" }); this.addCommand({ id: 'open\\x2Dnow-command' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("run", "this.addCommand({ id: \"run\" }); this.addCommand({ id: 'open\\x2Dnow-command' });")] },
                { messageId: "commandInId", suggestions: [rename("open-now", "this.addCommand({ id: \"run\\u002Dcommand\" }); this.addCommand({ id: 'open\\x2Dnow' });")] },
            ],
        },
        {
            name: "the suggestion keeps comments, parentheses and ?. around the ID",
            code: "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('open-command'),\r\n    name: 'Open',\r\n});",
            errors: [{
                messageId: "commandInId",
                suggestions: [rename("open", "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('open'),\r\n    name: 'Open',\r\n});")],
            }],
        },
        {
            name: "no suggestion where nothing but 'command' is left",
            code: commands(["command", "command--", "command:Command"]),
            errors: renamedLines([], [null, null, null]),
        },
        {
            name: "no suggestion where 'command' is next to something other than a separator",
            code: commands(["command#open", "open+command"]),
            errors: renamedLines([], [null, null]),
        },
        {
            // Two commands with one ID: Obsidian keeps only one of them.
            name: "no suggestion where another command in the file has the ID already",
            code: "this.addCommand({ id: 'open-command', name: 'Open' });\nconst commands = [{ id: 'open', name: 'Open note', callback }];",
            errors: [{ messageId: "commandInId", suggestions: [] }],
        },
    ],
});

new EslintRuleTester().run("no-command-in-command-id in a JavaScript file", noCommandInIdRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"open-command\",\n    name: \"Open\",\n});",
            errors: [{
                messageId: "commandInId",
                suggestions: [{ messageId: "removeCommand", data: { id: "open" }, output: "this.addCommand({\n    id: \"open\",\n    name: \"Open\",\n});" }],
            }],
        },
    ],
});
