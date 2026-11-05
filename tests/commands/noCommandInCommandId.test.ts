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
            // obsidian-advanced-uri, obsidian-git, obsidian-meta-bind-plugin:
            // "command" is what the command acts on.
            name: "'command' that is a word of the ID, not a label, is not reported",
            code: commands([
                "copy-uri-command",
                "raw-command",
                "copy-command-id",
                "open-command-selector",
                "run-command",
                "run-shell-command",
                "open-note-for-command",
                "commandPalette",
                "command-id-copy",
                "open.command.now",
                "openCommandPDF",
                "run-commandNow",
                "myCommand",
                "command",
                "command--",
                "command:Command",
                "command-run-command",
            ]),
        },
        {
            name: "an ID whose command name needs the word 'command' is not reported",
            code: "this.addCommand({ id: 'insert-snippet-command', name: 'Insert snippet for command' }); this.addCommand({ id: 'toggle-view-command', name: 'Toggle command palette view' });",
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
            name: "id ending with 'Command' (camelCase) is forbidden",
            code: "this.addCommand({ id: 'openNoteCommand' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("openNote", "this.addCommand({ id: 'openNote' });")] }],
        },
        {
            name: "id starting with 'command' in camelCase is forbidden",
            code: "this.addCommand({ id: 'commandOpenNote' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("openNote", "this.addCommand({ id: 'openNote' });")] }],
        },
        {
            name: "'command' after an acronym is forbidden",
            code: "this.addCommand({ id: 'exportPDFCommand' });",
            errors: [{ messageId: "commandInId", suggestions: [rename("exportPDF", "this.addCommand({ id: 'exportPDF' });")] }],
        },
        {
            name: "'command' after other separators is forbidden",
            code: "this.addCommand({ id: 'open_note_command' }); this.addCommand({ id: 'editor:open:COMMAND' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("open_note", "this.addCommand({ id: 'open_note' }); this.addCommand({ id: 'editor:open:COMMAND' });")] },
                { messageId: "commandInId", suggestions: [rename("editor:open", "this.addCommand({ id: 'open_note_command' }); this.addCommand({ id: 'editor:open' });")] },
            ],
        },
        {
            name: "an ID whose command name has a redundant 'command', or none, is reported",
            code: "this.addCommand({ id: 'open-settings-command', name: 'Open settings command' }); this.addCommand({ id: 'toggle-view-command', name: 'Toggle view' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("open-settings", "this.addCommand({ id: 'open-settings', name: 'Open settings command' }); this.addCommand({ id: 'toggle-view-command', name: 'Toggle view' });")] },
                { messageId: "commandInId", suggestions: [rename("toggle-view", "this.addCommand({ id: 'open-settings-command', name: 'Open settings command' }); this.addCommand({ id: 'toggle-view', name: 'Toggle view' });")] },
            ],
        },
        {
            name: "a quoted id key is checked",
            code: "this.addCommand({ \"id\": \"open-note-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'toggleViewCommand' }); this.addCommand({ ['id']: 'command-open-note' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("open-note", "this.addCommand({ \"id\": \"open-note\", \"name\": \"Open\" }); this.addCommand({ 'id': 'toggleViewCommand' }); this.addCommand({ ['id']: 'command-open-note' });")] },
                { messageId: "commandInId", suggestions: [rename("toggleView", "this.addCommand({ \"id\": \"open-note-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'toggleView' }); this.addCommand({ ['id']: 'command-open-note' });")] },
                { messageId: "commandInId", suggestions: [rename("open-note", "this.addCommand({ \"id\": \"open-note-command\", \"name\": \"Open\" }); this.addCommand({ 'id': 'toggleViewCommand' }); this.addCommand({ ['id']: 'open-note' });")] },
            ],
        },
        {
            name: "a spread in the command object is skipped, and the id still checked",
            code: "this.addCommand({ ...base, id: 'open-note-command' });",
            errors: [{
                messageId: "commandInId",
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 51,
                suggestions: [rename("open-note", "this.addCommand({ ...base, id: 'open-note' });")],
            }],
        },
        {
            name: "the suggestion removes 'command' at both ends, and keeps a camelCase ID camelCase",
            code: commands(["command-open-note-command", "CommandOpenNote", "commandOpenNote", "command-openNote"]),
            errors: renamedLines(
                ["command-open-note-command", "CommandOpenNote", "commandOpenNote", "command-openNote"],
                ["open-note", "OpenNote", "openNote", "openNote"],
            ),
        },
        {
            name: "the suggestion keeps the quotes and the escapes",
            code: "this.addCommand({ id: \"open-note\\u002Dcommand\" }); this.addCommand({ id: 'open\\x2Dnow-command' });",
            errors: [
                { messageId: "commandInId", suggestions: [rename("open-note", "this.addCommand({ id: \"open-note\" }); this.addCommand({ id: 'open\\x2Dnow-command' });")] },
                { messageId: "commandInId", suggestions: [rename("open-now", "this.addCommand({ id: \"open-note\\u002Dcommand\" }); this.addCommand({ id: 'open\\x2Dnow' });")] },
            ],
        },
        {
            name: "the suggestion keeps comments, parentheses and ?. around the ID",
            code: "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('open-note-command'),\r\n    name: 'Open',\r\n});",
            errors: [{
                messageId: "commandInId",
                suggestions: [rename("open-note", "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('open-note'),\r\n    name: 'Open',\r\n});")],
            }],
        },
        {
            name: "no suggestion where 'command' is next to something other than a separator",
            code: commands(["command#open-note", "open-note+command"]),
            errors: renamedLines([], [null, null]),
        },
        {
            // Two commands with one ID: Obsidian keeps only one of them.
            name: "no suggestion where another command in the file has the ID already",
            code: "this.addCommand({ id: 'open-note-command', name: 'Open' });\nconst commands = [{ id: 'open-note', name: 'Open note', callback }];",
            errors: [{ messageId: "commandInId", suggestions: [] }],
        },
    ],
});

new EslintRuleTester().run("no-command-in-command-id in a JavaScript file", noCommandInIdRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"open-note-command\",\n    name: \"Open\",\n});",
            errors: [{
                messageId: "commandInId",
                suggestions: [{ messageId: "removeCommand", data: { id: "open-note" }, output: "this.addCommand({\n    id: \"open-note\",\n    name: \"Open\",\n});" }],
            }],
        },
    ],
});
