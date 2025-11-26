import { RuleTester } from "@typescript-eslint/rule-tester";
import noPluginNameRule from "../../lib/rules/commands/noPluginNameInCommandName.js";

const ruleTester = new RuleTester();

ruleTester.run("no-plugin-name-in-command-name", noPluginNameRule, {
    valid: [
        { code: "this.addCommand({ name: 'Open a new note' });", options: [{ pluginName: "My Awesome Plugin" }] }
    ],
    invalid: [
        {
            code: "this.addCommand({ name: 'My Awesome Plugin: Open a new note' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
        },
        {
            code: "this.addCommand({ name: 'Open a new note (for My Awesome Plugin)' });",
            options: [{ pluginName: "My Awesome Plugin" }],
            errors: [{ messageId: "pluginName" }],
        },
    ],
});
