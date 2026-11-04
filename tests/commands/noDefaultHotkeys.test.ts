import { RuleTester } from "@typescript-eslint/rule-tester";
import noDefaultHotkeyRule from "../../lib/rules/commands/noDefaultHotkey.js";

const ruleTester = new RuleTester();

ruleTester.run("no-default-hotkey", noDefaultHotkeyRule, {
    valid: [
        {
            name: "command without hotkeys is allowed",
            code: "this.addCommand({ id: 'foo', name: 'bar' });",
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { id: 'foo', name: 'bar', hotkeys: [] }; this.addCommand(command);",
        },
        {
            name: "a computed key that is a variable is not hotkeys",
            code: "this.addCommand({ id: 'foo', name: 'bar', [hotkeys]: [] });",
        },
        {
            name: "another quoted key is not hotkeys",
            code: "this.addCommand({ 'id': 'foo', 'name': 'bar', 'hotkey': [] });",
        },
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ hotkeys: [] }); addCommand({ hotkeys: [] }); class A { #addCommand(o: object) {} run() { this.#addCommand({ hotkeys: [] }); } }",
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ hotkeys: [] }));",
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
        {
            name: "a quoted hotkeys key is forbidden",
            code: "this.addCommand({ \"id\": \"foo\", \"hotkeys\": [] }); this.addCommand({ 'hotkeys': [] }); this.addCommand({ ['hotkeys']: [] });",
            errors: [{ messageId: "hotkeys" }, { messageId: "hotkeys" }, { messageId: "hotkeys" }],
        },
        {
            name: "a spread in the command object is skipped, and the hotkeys still checked",
            code: "this.addCommand({ ...base, hotkeys: [] });",
            errors: [{ messageId: "hotkeys", line: 1, column: 28, endLine: 1, endColumn: 39 }],
        },
    ],
});
