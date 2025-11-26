import { RuleTester } from "@typescript-eslint/rule-tester";
import noPluginIdRule from "../../lib/rules/commands/noPluginIdInCommandId.js";

const ruleTester = new RuleTester();

ruleTester.run("no-plugin-id-in-command-id", noPluginIdRule, {
    valid: [
        { code: "this.addCommand({ id: 'open-new-note' });", options: [{ pluginId: "my-plugin" }] },
        { code: "this.addCommand({ id: 'another-action' });", options: [{ pluginId: "my-plugin" }] },
    ],
    invalid: [
        {
            code: "this.addCommand({ id: 'my-plugin-open-note' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }],
        },
        {
            code: "this.addCommand({ id: 'open-note-for-my-plugin' });",
            options: [{ pluginId: "my-plugin" }],
            errors: [{ messageId: "pluginId" }],
        },
    ],
});
