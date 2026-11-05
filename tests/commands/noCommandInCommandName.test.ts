import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import noCommandInNameRule from "../../lib/rules/commands/noCommandInCommandName.js";

const ruleTester = new RuleTester();

// The suggestion that renames a command to `name`, giving `output`
const rename = (name: string, output: string) => ({ messageId: "removeCommand" as const, data: { name }, output });
// A command named `name`, in single quotes
const command = (name: string) => `this.addCommand({ name: '${name}' });`;
// One command a line, named `names`
const commands = (names: readonly string[]) => names.map(command).join("\n");
// The errors for one command a line, named `names`, and the suggestion to
// rename each to what `renamed` has for it, or none for null
const renamedLines = (names: readonly string[], renamed: ReadonlyArray<string | null>) => renamed.map((name, i) => ({
    messageId: "commandInName" as const,
    line: i + 1,
    suggestions: name === null ? [] : [rename(name, commands(names.map((other, j) => (j === i ? name : other))))],
}));

const SEPARATED_NAMES = [
    "Command: run",
    "Command - run",
    "Command | run",
    "[Command] run",
    "Run - command",
    "Run | command",
    "Run: command",
    "Run [command]",
    "Run command",
];
// Without the word these would not read, or would mean something else
const SENTENCE_NAMES = [
    "Command palette: open",
    "Toggle command palette",
    "Run command.",
    "Command-line tools",
    "Run (command) now",
];

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
            errors: [{ messageId: "commandInName", suggestions: [rename("My Awesome", "this.addCommand({ name: 'My Awesome' });")] }],
        },
        {
            name: "name starting with 'command:' is forbidden",
            code: "this.addCommand({ name: 'command: do something' });",
            // "command" began with a lower case letter, so the rest keeps its case
            errors: [{ messageId: "commandInName", suggestions: [rename("do something", "this.addCommand({ name: 'do something' });")] }],
        },
        {
            name: "'command' next to punctuation is forbidden",
            code: "this.addCommand({ name: 'Run (command)' }); this.addCommand({ name: 'Open-command' });",
            errors: [
                { messageId: "commandInName", suggestions: [rename("Run", "this.addCommand({ name: 'Run' }); this.addCommand({ name: 'Open-command' });")] },
                // "Open-command" is one word
                { messageId: "commandInName", suggestions: [] },
            ],
        },
        {
            name: "a quoted name key is checked",
            code: "this.addCommand({ \"id\": \"run\", \"name\": \"Run command\" }); this.addCommand({ 'name': 'Command: run' }); this.addCommand({ ['name']: 'Run command' });",
            errors: [
                { messageId: "commandInName", suggestions: [rename("Run", "this.addCommand({ \"id\": \"run\", \"name\": \"Run\" }); this.addCommand({ 'name': 'Command: run' }); this.addCommand({ ['name']: 'Run command' });")] },
                { messageId: "commandInName", suggestions: [rename("Run", "this.addCommand({ \"id\": \"run\", \"name\": \"Run command\" }); this.addCommand({ 'name': 'Run' }); this.addCommand({ ['name']: 'Run command' });")] },
                { messageId: "commandInName", suggestions: [rename("Run", "this.addCommand({ \"id\": \"run\", \"name\": \"Run command\" }); this.addCommand({ 'name': 'Command: run' }); this.addCommand({ ['name']: 'Run' });")] },
            ],
        },
        {
            name: "a spread in the command object is skipped, and the name still checked",
            code: "this.addCommand({ ...base, name: 'Run command' });",
            errors: [{
                messageId: "commandInName",
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 47,
                suggestions: [rename("Run", "this.addCommand({ ...base, name: 'Run' });")],
            }],
        },
        {
            name: "the suggestion removes 'command' and its separator at the start or the end",
            code: commands(SEPARATED_NAMES),
            errors: renamedLines(SEPARATED_NAMES, SEPARATED_NAMES.map(() => "Run")),
        },
        {
            name: "the name left starts with a capital where 'command' did",
            code: commands(["Command: pdf export", "COMMAND: open Recent Files", "command - Run"]),
            errors: renamedLines(
                ["Command: pdf export", "COMMAND: open Recent Files", "command - Run"],
                ["PDF export", "Open Recent Files", "Run"],
            ),
        },
        {
            name: "the suggestion keeps the quotes and the escapes",
            code: "this.addCommand({ name: \"Say \\\"hi\\\" command\" }); this.addCommand({ name: 'Command \\u2014 don\\'t run' });",
            errors: [
                { messageId: "commandInName", suggestions: [rename("Say \"hi\"", "this.addCommand({ name: \"Say \\\"hi\\\"\" }); this.addCommand({ name: 'Command \\u2014 don\\'t run' });")] },
                { messageId: "commandInName", suggestions: [rename("Don't run", "this.addCommand({ name: \"Say \\\"hi\\\" command\" }); this.addCommand({ name: 'Don\\'t run' });")] },
            ],
        },
        {
            name: "the suggestion keeps comments, parentheses and ?. around the name",
            code: "this?.addCommand({\r\n    id: 'run',\r\n    // the name\r\n    name: /* old */ ('Run command'),\r\n});",
            errors: [{
                messageId: "commandInName",
                suggestions: [rename("Run", "this?.addCommand({\r\n    id: 'run',\r\n    // the name\r\n    name: /* old */ ('Run'),\r\n});")],
            }],
        },
        {
            name: "no suggestion where nothing but 'command' is left",
            code: commands(["Command", "Command:", "(command)", "Command: command"]),
            errors: renamedLines([], [null, null, null, null]),
        },
        {
            name: "no suggestion where 'command' is part of the sentence",
            code: commands(SENTENCE_NAMES),
            errors: renamedLines(SENTENCE_NAMES, SENTENCE_NAMES.map(() => null)),
        },
    ],
});

new EslintRuleTester().run("no-command-in-command-name in a JavaScript file", noCommandInNameRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"run\",\n    name: \"Run command\",\n});",
            errors: [{
                messageId: "commandInName",
                suggestions: [{ messageId: "removeCommand", data: { name: "Run" }, output: "this.addCommand({\n    id: \"run\",\n    name: \"Run\",\n});" }],
            }],
        },
    ],
});
