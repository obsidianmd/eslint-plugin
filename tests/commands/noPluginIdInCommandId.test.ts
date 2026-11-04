import { RuleTester } from "@typescript-eslint/rule-tester";
import noPluginIdRule from "../../lib/rules/commands/noPluginIdInCommandId.js";

const ruleTester = new RuleTester();

ruleTester.run("no-plugin-id-in-command-id", noPluginIdRule, {
    valid: [
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
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "id ending with plugin id is forbidden",
            code: "this.addCommand({ id: 'open-note-for-my-plugin' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "plugin id in another case is forbidden",
            code: "this.addCommand({ id: 'My-Plugin-open-note' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "plugin id in camelCase is forbidden",
            code: "this.addCommand({ id: 'myPluginOpenNote' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "plugin id between other separators is forbidden",
            code: "this.addCommand({ id: 'my_plugin_open' }); this.addCommand({ id: 'my-plugin:open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }, { messageId: "pluginId" }],
        },
        {
            name: "a one-word plugin id is found as a word",
            code: "this.addCommand({ id: 'git-commit' }); this.addCommand({ id: 'pullFromGit' });",
            options: [{ pluginId: "git" }],
            errors: [{ messageId: "pluginId" }, { messageId: "pluginId" }],
        },
        {
            name: "a quoted id key is checked",
            code: "this.addCommand({ \"id\": \"my-plugin-open\", \"name\": \"Open\" }); this.addCommand({ 'id': 'myPluginOpen' }); this.addCommand({ ['id']: 'open-my-plugin' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }, { messageId: "pluginId" }, { messageId: "pluginId" }],
        },
        {
            // This repository's own manifest.json has "id": "sample-plugin".
            name: "plugin id defaults to manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open-note' });",
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "a spread in the command object is skipped, and the id still checked",
            code: "this.addCommand({ ...base, id: 'my-plugin-open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", line: 1, column: 28, endLine: 1, endColumn: 48 }],
        },
        {
            // pluginId wins over the manifest's "sample-plugin".
            name: "the pluginId option replaces manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open' }); this.addCommand({ id: 'my-plugin-open' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId", column: 66 }],
        },
        {
            name: "a plugin id in letters outside ASCII is found as a word",
            code: "this.addCommand({ id: 'open-笔记' });",
            options: [{ pluginId: "笔记" }],
            errors: [{ messageId: "pluginId" }],
        },
        {
            name: "a camelCase hump at a capital outside ASCII ends a word",
            code: "this.addCommand({ id: 'notizenÖffnen' });",
            options: [{ pluginId: "öffnen" }],
            errors: [{ messageId: "pluginId" }],
        },
    ],
});
