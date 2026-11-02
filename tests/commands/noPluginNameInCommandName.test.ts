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
            name: "plugin name inside a longer word is forbidden",
            code: "this.addCommand({ name: 'Insert digit' });",
            options: [{ pluginName: "Git" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            // This repository's own manifest.json has "name": "Sample Plugin".
            name: "plugin name defaults to manifest.json's name",
            code: "this.addCommand({ name: 'Sample Plugin: Open a new note' });",
            errors: [{ messageId: "pluginName" }],
        },
    ],
});
