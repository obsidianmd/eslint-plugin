import { RuleTester } from "@typescript-eslint/rule-tester";
import noPluginNameRule from "../../lib/rules/commands/noPluginNameInCommandName.js";

const ruleTester = new RuleTester();

ruleTester.run("no-plugin-name-in-command-name", noPluginNameRule, {
    valid: [
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
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "name containing plugin name in parentheses is forbidden",
            code: "this.addCommand({ name: 'Open a new note (for My Awesome Plugin)' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "plugin name in another case is forbidden",
            code: "this.addCommand({ name: 'my awesome plugin: Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a short plugin name is found as a word",
            code: "this.addCommand({ name: 'Commit with git' });",
            options: [{ pluginName: "Git" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a plugin name next to punctuation is found",
            code: "this.addCommand({ name: 'Open (Git)' });",
            options: [{ pluginName: "Git" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a plugin name with letters outside ASCII is found in another case",
            code: "this.addCommand({ name: 'über notes: open' });",
            options: [{ pluginName: "Über Notes" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a plugin name with regex special characters is found",
            code: "this.addCommand({ name: 'C++ Tools: build' });",
            options: [{ pluginName: "C++ Tools" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "the words of a plugin name may be split by other whitespace",
            code: "this.addCommand({ name: 'My  Awesome\tPlugin: open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a quoted name key is checked",
            code: "this.addCommand({ \"id\": \"open\", \"name\": \"My Awesome Plugin: Open\" }); this.addCommand({ 'name': 'Open (My Awesome Plugin)' }); this.addCommand({ ['name']: 'My Awesome Plugin: Close' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }, { messageId: "pluginName" }, { messageId: "pluginName" }],
        },
        {
            // This repository's own manifest.json has "name": "Sample Plugin".
            name: "plugin name defaults to manifest.json's name",
            code: "this.addCommand({ name: 'Sample Plugin: Open a new note' });",
            errors: [{ messageId: "pluginName" }],
        },
        {
            name: "a spread in the command object is skipped, and the name still checked",
            code: "this.addCommand({ ...base, name: 'My Awesome Plugin: Open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", line: 1, column: 28, endLine: 1, endColumn: 59 }],
        },
        {
            // pluginName wins over the manifest's "Sample Plugin".
            name: "the pluginName option replaces manifest.json's name",
            code: "this.addCommand({ name: 'Sample Plugin: open' }); this.addCommand({ name: 'My Awesome Plugin: open' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName", column: 69 }],
        },
    ],
});
