import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import noPluginIdRule from "../../lib/rules/commands/noPluginIdInCommandId.js";

const ruleTester = new RuleTester();

// The suggestion that renames a command ID to `id`, giving `output`
const rename = (id: string, output: string) => ({ messageId: "removePluginId" as const, data: { id }, output });

ruleTester.run("no-plugin-id-in-command-id", noPluginIdRule, {
    valid: [
        {
            // obsidian-zoom: the name has the plugin ID's word as its verb,
            // and the ID follows the name.
            name: "an ID whose name starts with the plugin ID's words as a word of the sentence is allowed",
            code: "this.addCommand({ id: 'zoom-in', name: 'Zoom in', callback }); this.addCommand({ id: 'zoom-out-all', name: 'Zoom out of everything', callback });",
            options: [{ pluginId: "zoom" }],
        },
        {
            name: "id without plugin id is allowed",
            code: "this.addCommand({ id: 'open-new-note' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "different id without plugin id is allowed",
            code: "this.addCommand({ id: 'another-action' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "plugin id inside a longer word is allowed",
            code: "this.addCommand({ id: 'open-digital-garden' }); this.addCommand({ id: 'legit' });",
            options: [{ pluginId: "git" }],
        },
        {
            name: "the words of the plugin id must be together and whole",
            code: "this.addCommand({ id: 'my-plugins-list' }); this.addCommand({ id: 'my-open-plugin' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "an empty plugin id matches nothing",
            code: "this.addCommand({ id: 'open-note' });",
            options: [{ pluginId: "-" }],
        },
        {
            name: "id from a template literal is not checked",
            code: "this.addCommand({ id: `my-plugin-open-note` });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { id: 'my-plugin-open-note' }; this.addCommand(command);",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "a computed key that is a variable is not the id",
            code: "this.addCommand({ [id]: 'my-plugin-open-note' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "another quoted key is not the id",
            code: "this.addCommand({ 'id': 'open-note', 'name': 'my-plugin', 'pluginId': 'my-plugin' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ id: 'my-plugin-open' }); addCommand({ id: 'my-plugin-open' }); class A { #addCommand(o: object) {} run() { this.#addCommand({ id: 'my-plugin-open' }); } }",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ id: 'my-plugin-open' }));",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "a id that is not a string is not checked",
            code: "this.addCommand({ id: 1 }); this.addCommand({ id: null }); this.addCommand({ id: /my-plugin-open/ });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            // calendar, homepage, surfing: the plugin ID names what the
            // command acts on, not a namespace.
            name: "the plugin ID after the start of the command ID is not reported",
            code: [
                "this.addCommand({ id: 'show-calendar-view' });",
                "this.addCommand({ id: 'open-calendar' });",
                "this.addCommand({ id: 'pullFromCalendar' });",
                "this.addCommand({ id: 'open+calendar' });",
            ].join("\n"),
            options: [{ pluginId: "calendar" }],
        },
        {
            name: "a multi-word plugin ID in the middle or at the end is not reported",
            code: "this.addCommand({ id: 'open-note-for-my-plugin' }); this.addCommand({ id: 'open-my-plugin-note' }); this.addCommand({ id: 'openMyPluginNote' });",
            options: [{ pluginId: "my-plugin" }],
        },
        {
            name: "digits are part of a word of the id",
            code: "this.addCommand({ id: 'open-base64-note' }); this.addCommand({ id: 'open-base64Note' });",
            options: [{ pluginId: "base" }],
        },
    ],
    invalid: [
        {
            name: "id starting with plugin id is forbidden",
            code: "this.addCommand({ id: 'my-plugin-open-note' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("open-note", "this.addCommand({ id: 'open-note' });")] }],
        },
        {
            name: "plugin id in another case is forbidden",
            code: "this.addCommand({ id: 'My-Plugin-open-note' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("open-note", "this.addCommand({ id: 'open-note' });")] }],
        },
        {
            name: "plugin id in camelCase is forbidden",
            code: "this.addCommand({ id: 'myPluginOpenNote' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("openNote", "this.addCommand({ id: 'openNote' });")] }],
        },
        {
            name: "plugin id between other separators is forbidden",
            code: "this.addCommand({ id: 'my_plugin_open' }); this.addCommand({ id: 'my-plugin:open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ id: 'open' }); this.addCommand({ id: 'my-plugin:open' });")] },
                { messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ id: 'my_plugin_open' }); this.addCommand({ id: 'open' });")] },
            ],
        },
        {
            name: "a one-word plugin id is found as a word",
            code: "this.addCommand({ id: 'git-commit' }); this.addCommand({ id: 'gitPull' });",
            options: [{ pluginId: "git" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("commit", "this.addCommand({ id: 'commit' }); this.addCommand({ id: 'gitPull' });")] },
                { messageId: "pluginId", suggestions: [rename("pull", "this.addCommand({ id: 'git-commit' }); this.addCommand({ id: 'pull' });")] },
            ],
        },
        {
            name: "no suggestion that would leave only a word such as `in`, which names no command",
            code: "this.addCommand({ id: 'zoom-in', name: 'Enlarge' }); this.addCommand({ id: 'zoom-out', name: t('out') }); this.addCommand({ id: 'zoom-in', name: 'Zoom: zoom in' });",
            options: [{ pluginId: "zoom" }],
            errors: [
                { messageId: "pluginId", suggestions: [] },
                { messageId: "pluginId", suggestions: [] },
                { messageId: "pluginId", suggestions: [] },
            ],
        },
        {
            name: "a quoted id key is checked",
            code: "this.addCommand({ \"id\": \"my-plugin-open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'myPluginOpen' }); this.addCommand({ ['id']: 'my-plugin-close' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ \"id\": \"open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'myPluginOpen' }); this.addCommand({ ['id']: 'my-plugin-close' });")] },
                { messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ \"id\": \"my-plugin-open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'open' }); this.addCommand({ ['id']: 'my-plugin-close' });")] },
                { messageId: "pluginId", suggestions: [rename("close", "this.addCommand({ \"id\": \"my-plugin-open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'myPluginOpen' }); this.addCommand({ ['id']: 'close' });")] },
            ],
        },
        {
            // This repository's own manifest.json has "id": "sample-plugin".
            name: "plugin id defaults to manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open-note' });",
            errors: [{ messageId: "pluginId", suggestions: [rename("open-note", "this.addCommand({ id: 'open-note' });")] }],
        },
        {
            name: "a spread in the command object is skipped, and the id still checked",
            code: "this.addCommand({ ...base, id: 'my-plugin-open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{
                messageId: "pluginId",
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 48,
                suggestions: [rename("open", "this.addCommand({ ...base, id: 'open' });")],
            }],
        },
        {
            // pluginId wins over the manifest's "sample-plugin".
            name: "the pluginId option replaces manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open' }); this.addCommand({ id: 'my-plugin-open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", column: 66, suggestions: [rename("open", "this.addCommand({ id: 'sample-plugin-open' }); this.addCommand({ id: 'open' });")] }],
        },
        {
            name: "a plugin id in letters outside ASCII is found as a word",
            code: "this.addCommand({ id: '笔记-open' });",
            options: [{ pluginId: "笔记" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ id: 'open' });")] }],
        },
        {
            name: "a camelCase hump at a capital outside ASCII ends a word",
            code: "this.addCommand({ id: 'notizenÖffnen' });",
            options: [{ pluginId: "notizen" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("öffnen", "this.addCommand({ id: 'öffnen' });")] }],
        },
        {
            name: "the suggestion strips every separator next to the plugin ID",
            code: "this.addCommand({ id: 'my-plugin: open' }); this.addCommand({ id: 'my-plugin -- note' }); this.addCommand({ id: 'my-plugin/close' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ id: 'open' }); this.addCommand({ id: 'my-plugin -- note' }); this.addCommand({ id: 'my-plugin/close' });")] },
                { messageId: "pluginId", suggestions: [rename("note", "this.addCommand({ id: 'my-plugin: open' }); this.addCommand({ id: 'note' }); this.addCommand({ id: 'my-plugin/close' });")] },
                { messageId: "pluginId", suggestions: [rename("close", "this.addCommand({ id: 'my-plugin: open' }); this.addCommand({ id: 'my-plugin -- note' }); this.addCommand({ id: 'close' });")] },
            ],
        },
        {
            // "myPluginNote" loses the camelCase run the plugin ID began.
            name: "the suggestion keeps a camelCase ID camelCase",
            code: "this.addCommand({ id: 'myPluginNote' }); this.addCommand({ id: 'MyPluginNote' }); this.addCommand({ id: 'myPluginPDFExport' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("note", "this.addCommand({ id: 'note' }); this.addCommand({ id: 'MyPluginNote' }); this.addCommand({ id: 'myPluginPDFExport' });")] },
                { messageId: "pluginId", suggestions: [rename("Note", "this.addCommand({ id: 'myPluginNote' }); this.addCommand({ id: 'Note' }); this.addCommand({ id: 'myPluginPDFExport' });")] },
                { messageId: "pluginId", suggestions: [rename("PDFExport", "this.addCommand({ id: 'myPluginNote' }); this.addCommand({ id: 'MyPluginNote' }); this.addCommand({ id: 'PDFExport' });")] },
            ],
        },
        {
            name: "the suggestion removes the plugin ID only where it starts the command ID, as often as it does",
            code: "this.addCommand({ id: 'my-plugin-open-my-plugin' }); this.addCommand({ id: 'my-plugin-my-plugin-close' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("open-my-plugin", "this.addCommand({ id: 'open-my-plugin' }); this.addCommand({ id: 'my-plugin-my-plugin-close' });")] },
                { messageId: "pluginId", suggestions: [rename("close", "this.addCommand({ id: 'my-plugin-open-my-plugin' }); this.addCommand({ id: 'close' });")] },
            ],
        },
        {
            name: "the suggestion keeps the quotes and the escapes",
            code: "this.addCommand({ id: \"my-plugin:open\\x2Dnote\" }); this.addCommand({ id: 'my-plugin\\u002Dclose' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [rename("open-note", "this.addCommand({ id: \"open\\x2Dnote\" }); this.addCommand({ id: 'my-plugin\\u002Dclose' });")] },
                { messageId: "pluginId", suggestions: [rename("close", "this.addCommand({ id: \"my-plugin:open\\x2Dnote\" }); this.addCommand({ id: 'close' });")] },
            ],
        },
        {
            name: "the suggestion drops a line continuation next to the plugin ID",
            code: "this.addCommand({ id: 'my-plugin-\\\nopen' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", suggestions: [rename("open", "this.addCommand({ id: 'open' });")] }],
        },
        {
            name: "the suggestion keeps comments, parentheses and ?. around the ID",
            code: "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('my-plugin-open'),\r\n    name: 'Open',\r\n});",
            options: [{ pluginId: "my-plugin" }],
            errors: [{
                messageId: "pluginId",
                suggestions: [rename("open", "this?.addCommand({\r\n    // the ID\r\n    id: /* old */ ('open'),\r\n    name: 'Open',\r\n});")],
            }],
        },
        {
            name: "no suggestion where nothing but the plugin ID is left",
            code: "this.addCommand({ id: 'my-plugin' }); this.addCommand({ id: 'my-plugin--' }); this.addCommand({ id: 'my-plugin:myPlugin' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", suggestions: [] },
                { messageId: "pluginId", suggestions: [] },
                { messageId: "pluginId", suggestions: [] },
            ],
        },
        {
            name: "no suggestion where the plugin ID is next to something other than a separator",
            code: "this.addCommand({ id: 'my-plugin#open' }); this.addCommand({ id: 'my-plugin+open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", suggestions: [] }, { messageId: "pluginId", suggestions: [] }],
        },
        {
            // Two commands with one ID: Obsidian keeps only one of them.
            name: "no suggestion where another command in the file has the ID already",
            code: [
                "this.addCommand({ id: 'my-plugin-open', name: 'Open' });",
                "this.addCommand({ id: 'open', name: 'Open note' });",
                "this.addCommand({ id: 'my-plugin-close', name: 'Close' });",
                "this.addCommand({ id: `close`, name: 'Close note' });",
                "this.addCommand({ id: 'my-plugin-save', name: 'Save' });",
                "const commands = [{ id: 'save', name: 'Save note', callback }];",
            ].join("\n"),
            options: [{ pluginId: "my-plugin" }],
            errors: [
                { messageId: "pluginId", line: 1, suggestions: [] },
                { messageId: "pluginId", line: 3, suggestions: [] },
                { messageId: "pluginId", line: 5, suggestions: [] },
            ],
        },
        {
            name: "an object with an ID and no name is not taken for a command",
            code: "this.addCommand({ id: 'my-plugin-open', name: 'Open' }); const view = { id: 'open' };",
            options: [{ pluginId: "my-plugin" }],
            errors: [{
                messageId: "pluginId",
                suggestions: [rename("open", "this.addCommand({ id: 'open', name: 'Open' }); const view = { id: 'open' };")],
            }],
        },
    ],
});

new EslintRuleTester().run("no-plugin-id-in-command-id in a JavaScript file", noPluginIdRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"my-plugin-open\",\n    name: \"Open\",\n});",
            options: [{ pluginId: "my-plugin" }],
            errors: [{
                messageId: "pluginId",
                suggestions: [{ messageId: "removePluginId", data: { id: "open" }, output: "this.addCommand({\n    id: \"open\",\n    name: \"Open\",\n});" }],
            }],
        },
    ],
});
