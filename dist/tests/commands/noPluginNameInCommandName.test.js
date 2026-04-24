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
    ],
});
