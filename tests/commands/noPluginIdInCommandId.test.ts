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
            // This repository's own manifest.json has "id": "sample-plugin".
            name: "plugin id defaults to manifest.json's id",
            code: "this.addCommand({ id: 'sample-plugin-open-note' });",
            errors: [{ messageId: "pluginId" }],
        },
    ],
});
