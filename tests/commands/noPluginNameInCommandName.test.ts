import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import noPluginNameRule from "../../lib/rules/commands/noPluginNameInCommandName.js";

const ruleTester = new RuleTester();

// The suggestion that renames a command to `name`, giving `output`
const rename = (name: string, output: string) => ({ messageId: "removePluginName" as const, data: { name }, output });
// A command named `name`, in single quotes
const command = (name: string) => `this.addCommand({ name: '${name}' });`;
// One command a line, named `names`
const commands = (names: readonly string[]) => names.map(command).join("\n");
// The errors for one command a line, named `names`, and the suggestion to
// rename each to what `renamed` has for it, or none for null
const renamedLines = (names: readonly string[], renamed: ReadonlyArray<string | null>) => renamed.map((name, i) => ({
    messageId: "pluginName" as const,
    line: i + 1,
    suggestions: name === null ? [] : [rename(name, commands(names.map((other, j) => (j === i ? name : other))))],
}));

const START_NAMES = [
    "Word Tally: count words",
    "Word Tally:count words",
    "Word Tally - count words",
    "Word Tally – count words",
    "Word Tally — count words",
    "Word Tally | count words",
    "Word Tally / count words",
    "Word Tally > count words",
    "[Word Tally] count words",
    "(Word Tally): count words",
    "Word Tally Count words",
];
const END_NAMES = [
    "Count words: Word Tally",
    "Count words - Word Tally",
    "Count words – Word Tally",
    "Count words—Word Tally",
    "Count words | Word Tally",
    "Count words (Word Tally)",
    "Count words [Word Tally]",
];
const CASED_NAMES = [
    "Word Tally: pdf export",
    "Word Tally: ios sync",
    "Word Tally: iPhone sync",
    "Word Tally: über alles",
    "Word Tally: open Recent Files",
    "word tally: open recent files",
    "Word Tally: 2 columns",
    "Count words (Word Tally)",
];
// Without the plugin name these would not read, or would mean something else
const SENTENCE_NAMES = [
    "Open Word Tally settings",
    "Count with Word Tally",
    "Word Tally: open Word Tally",
    "Word Tally-based count",
    "Word Tally\\'s settings",
    "Word Tally (count words)",
    "Word Tally: - count",
    "Count words for Word Tally.",
];

ruleTester.run("no-plugin-name-in-command-name", noPluginNameRule, {
    valid: [
        {
            // obsidian-zoom: the plugin name is the verb of the sentence, not
            // a label, and "In" would mean nothing.
            name: "the plugin name that starts the name as a word, before a lower-case one, is allowed",
            code: commands(["Zoom in", "Zoom out the entire document", "Zoom  into heading"]),
            options: [{ pluginName: "Zoom" }],
        },
        {
            name: "name without plugin name is allowed",
            code: "this.addCommand({ name: 'Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "name from a template literal is not checked",
            code: "this.addCommand({ name: `My Awesome Plugin: Open a new note` });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { name: 'My Awesome Plugin: Open a new note' }; this.addCommand(command);",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "a plugin name inside a longer word is allowed",
            code: "this.addCommand({ name: 'Open digital garden' }); this.addCommand({ name: 'Insert digit' });",
            options: [{ pluginName: "Git" }],
        },
        {
            // A JavaScript \b would end the word before the "ü".
            name: "a letter outside ASCII is part of the word",
            code: "this.addCommand({ name: 'Open Gitü' }); this.addCommand({ name: 'Open éGit' });",
            options: [{ pluginName: "Git" }],
        },
        {
            name: "only part of a multi-word plugin name is allowed",
            code: "this.addCommand({ name: 'Open awesome notes' });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "regex special characters in the plugin name are matched literally",
            code: "this.addCommand({ name: 'Open aXb' });",
            options: [{ pluginName: "a.b" }],
        },
        {
            name: "a computed key that is a variable is not the name",
            code: "this.addCommand({ [name]: 'My Awesome Plugin: Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "another quoted key is not the name",
            code: "this.addCommand({ 'id': 'my-awesome-plugin', 'name': 'Open a new note', 'title': 'My Awesome Plugin' });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "an empty plugin name matches nothing",
            code: "this.addCommand({ name: 'Open: a note' });",
            options: [{ pluginName: " " }],
        },
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ name: 'My Awesome Plugin: Open' }); addCommand({ name: 'My Awesome Plugin: Open' }); class A { #addCommand(o: object) {} run() { this.#addCommand({ name: 'My Awesome Plugin: Open' }); } }",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ name: 'My Awesome Plugin: Open' }));",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            name: "a name that is not a string is not checked",
            code: "this.addCommand({ name: 1 }); this.addCommand({ name: null }); this.addCommand({ name: /My Awesome Plugin: Open/ });",
            options: [{ pluginName: "My Awesome Plugin" }],
        },
        {
            // "Git" followed by U+0308, a combining diaeresis, or by a digit.
            name: "a combining mark or a digit is part of the word",
            code: "this.addCommand({ name: 'Open Git\\u0308 notes' }); this.addCommand({ name: 'Open Git2 notes' }); this.addCommand({ name: 'Open 2Git notes' });",
            options: [{ pluginName: "Git" }],
        },
    ],
    invalid: [
        {
            name: "name prefixed with plugin name is forbidden",
            code: "this.addCommand({ name: 'My Awesome Plugin: Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Open a new note", "this.addCommand({ name: 'Open a new note' });")] }],
        },
        {
            name: "name containing plugin name in parentheses is forbidden",
            code: "this.addCommand({ name: 'Open a new note (for My Awesome Plugin)' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            // "Open a new note (for)" would not read
            errors: [{ messageId: "pluginName", suggestions: [] }],
        },
        {
            name: "plugin name in another case is forbidden",
            code: "this.addCommand({ name: 'my awesome plugin: Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Open a new note", "this.addCommand({ name: 'Open a new note' });")] }],
        },
        {
            name: "a short plugin name is found as a word",
            code: "this.addCommand({ name: 'Commit with git' });",
            options: [{ pluginName: "Git" }],
            // "Commit with" would not read
            errors: [{ messageId: "pluginName", suggestions: [] }],
        },
        {
            name: "a plugin name next to punctuation is found",
            code: "this.addCommand({ name: 'Open (Git)' });",
            options: [{ pluginName: "Git" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Open", "this.addCommand({ name: 'Open' });")] }],
        },
        {
            name: "a plugin name with letters outside ASCII is found in another case",
            code: "this.addCommand({ name: 'über notes: open' });",
            options: [{ pluginName: "Über Notes" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("open", "this.addCommand({ name: 'open' });")] }],
        },
        {
            name: "a plugin name with regex special characters is found",
            code: "this.addCommand({ name: 'C++ Tools: build' });",
            options: [{ pluginName: "C++ Tools" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Build", "this.addCommand({ name: 'Build' });")] }],
        },
        {
            name: "the words of a plugin name may be split by other whitespace",
            code: "this.addCommand({ name: 'My  Awesome\tPlugin: open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Open", "this.addCommand({ name: 'Open' });")] }],
        },
        {
            name: "a quoted name key is checked",
            code: "this.addCommand({ \"id\": \"open\", \"name\": \"My Awesome Plugin: Open\" }); this.addCommand({ 'name': 'Open (My Awesome Plugin)' }); this.addCommand({ ['name']: 'My Awesome Plugin: Close' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [
                { messageId: "pluginName", suggestions: [rename("Open", "this.addCommand({ \"id\": \"open\", \"name\": \"Open\" }); this.addCommand({ 'name': 'Open (My Awesome Plugin)' }); this.addCommand({ ['name']: 'My Awesome Plugin: Close' });")] },
                { messageId: "pluginName", suggestions: [rename("Open", "this.addCommand({ \"id\": \"open\", \"name\": \"My Awesome Plugin: Open\" }); this.addCommand({ 'name': 'Open' }); this.addCommand({ ['name']: 'My Awesome Plugin: Close' });")] },
                { messageId: "pluginName", suggestions: [rename("Close", "this.addCommand({ \"id\": \"open\", \"name\": \"My Awesome Plugin: Open\" }); this.addCommand({ 'name': 'Open (My Awesome Plugin)' }); this.addCommand({ ['name']: 'Close' });")] },
            ],
        },
        {
            // This repository's own manifest.json has "name": "Sample Plugin".
            name: "plugin name defaults to manifest.json's name",
            code: "this.addCommand({ name: 'Sample Plugin: Open a new note' });",
            errors: [{ messageId: "pluginName", suggestions: [rename("Open a new note", "this.addCommand({ name: 'Open a new note' });")] }],
        },
        {
            name: "a spread in the command object is skipped, and the name still checked",
            code: "this.addCommand({ ...base, name: 'My Awesome Plugin: Open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{
                messageId: "pluginName",
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 59,
                suggestions: [rename("Open", "this.addCommand({ ...base, name: 'Open' });")],
            }],
        },
        {
            // pluginName wins over the manifest's "Sample Plugin".
            name: "the pluginName option replaces manifest.json's name",
            code: "this.addCommand({ name: 'Sample Plugin: open' }); this.addCommand({ name: 'My Awesome Plugin: open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", column: 69, suggestions: [rename("Open", "this.addCommand({ name: 'Sample Plugin: open' }); this.addCommand({ name: 'Open' });")] }],
        },
        {
            name: "the suggestion removes the plugin name and the separator after it at the start",
            code: commands(START_NAMES),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines(START_NAMES, START_NAMES.map(() => "Count words")),
        },
        {
            // The plugin name starts the name as the verb, and removing the
            // label would take the verb too: "In" would mean nothing.
            name: "no suggestion where the plugin name starts the name as a word and is a label elsewhere",
            code: commands(["Zoom in (Zoom)", "Zoom out - zoom"]),
            options: [{ pluginName: "Zoom" }],
            errors: renamedLines([], [null, null]),
        },
        {
            name: "a capitalised word after the plugin name and a space keeps the suggestion",
            code: command("Fit Sync"),
            options: [{ pluginName: "Fit" }],
            errors: renamedLines(["Fit Sync"], ["Sync"]),
        },
        {
            name: "the suggestion removes the plugin name and the separator before it at the end",
            code: commands(END_NAMES),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines(END_NAMES, END_NAMES.map(() => "Count words")),
        },
        {
            name: "the suggestion removes the plugin name every time it is there",
            code: command("Word Tally - Count words (Word Tally)"),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines(["Word Tally - Count words (Word Tally)"], ["Count words"]),
        },
        {
            // The first word starts the way ui/sentence-case has it, but no letter is lowered.
            name: "the name left starts with a capital where the plugin name did",
            code: commands(CASED_NAMES),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines(CASED_NAMES, [
                "PDF export",
                "iOS sync",
                "iPhone sync",
                "Über alles",
                "Open Recent Files",
                "open recent files",
                "2 columns",
                "Count words",
            ]),
        },
        {
            name: "the suggestion keeps the quotes and the escapes",
            code: "this.addCommand({ name: \"Word Tally: say \\\"hi\\\"\" }); this.addCommand({ name: 'Don\\'t count \\u2014 Word Tally' });",
            options: [{ pluginName: "Word Tally" }],
            errors: [
                { messageId: "pluginName", suggestions: [rename("Say \"hi\"", "this.addCommand({ name: \"Say \\\"hi\\\"\" }); this.addCommand({ name: 'Don\\'t count \\u2014 Word Tally' });")] },
                { messageId: "pluginName", suggestions: [rename("Don't count", "this.addCommand({ name: \"Word Tally: say \\\"hi\\\"\" }); this.addCommand({ name: 'Don\\'t count' });")] },
            ],
        },
        {
            name: "the suggestion drops a line continuation next to the plugin name",
            code: "this.addCommand({ name: 'Word Tally: \\\ncount words' });",
            options: [{ pluginName: "Word Tally" }],
            errors: [{ messageId: "pluginName", suggestions: [rename("Count words", "this.addCommand({ name: 'Count words' });")] }],
        },
        {
            name: "the suggestion keeps comments, parentheses and ?. around the name",
            code: "this?.addCommand({\r\n    id: 'count',\r\n    // the name\r\n    name: /* old */ ('Word Tally: count words'),\r\n});",
            options: [{ pluginName: "Word Tally" }],
            errors: [{
                messageId: "pluginName",
                suggestions: [rename("Count words", "this?.addCommand({\r\n    id: 'count',\r\n    // the name\r\n    name: /* old */ ('Count words'),\r\n});")],
            }],
        },
        {
            name: "no suggestion where nothing but the plugin name is left",
            code: commands(["Word Tally", "Word Tally:", "(Word Tally)", "Word Tally: Word Tally"]),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines([], [null, null, null, null]),
        },
        {
            name: "no suggestion where the plugin name is part of the sentence",
            code: commands(SENTENCE_NAMES),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines(SENTENCE_NAMES, SENTENCE_NAMES.map(() => null)),
        },
        {
            name: "no suggestion where the letter to capitalize is an escape",
            code: command("Word Tally: \\u0063ount words"),
            options: [{ pluginName: "Word Tally" }],
            errors: renamedLines([], [null]),
        },
    ],
});

new EslintRuleTester().run("no-plugin-name-in-command-name in a JavaScript file", noPluginNameRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"count\",\n    name: \"Word Tally: count words\",\n});",
            options: [{ pluginName: "Word Tally" }],
            errors: [{
                messageId: "pluginName",
                suggestions: [{ messageId: "removePluginName", data: { name: "Count words" }, output: "this.addCommand({\n    id: \"count\",\n    name: \"Count words\",\n});" }],
            }],
        },
    ],
});
