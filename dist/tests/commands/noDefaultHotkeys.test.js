import { RuleTester } from "@typescript-eslint/rule-tester";
import noDefaultHotkeyRule from "../../lib/rules/commands/noDefaultHotkey.js";
const ruleTester = new RuleTester();
ruleTester.run("no-default-hotkey", noDefaultHotkeyRule, {
    valid: [
        {
            name: "command without hotkeys is allowed",
            code: "this.addCommand({ id: 'foo', name: 'bar' });",
        },
    ],
    invalid: [
        {
            name: "command with empty hotkeys array is forbidden",
            code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [] });",
            errors: [{ messageId: "hotkeys" }],
        },
        {
            name: "command with hotkeys binding is forbidden",
            code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [{ modifiers: ['Mod'], key: 'P' }] });",
            errors: [{ messageId: "hotkeys" }],
        },
    ],
});
