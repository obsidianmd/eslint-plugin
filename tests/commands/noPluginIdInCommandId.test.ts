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
            // This repository's own manifest.json has "id": "sample-plugin".
            name: "plugin id defaults to manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open-note' });",
            errors: [{ messageId: "pluginId" }],
        },
    ],
});
