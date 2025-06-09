import { RuleTester } from "@typescript-eslint/rule-tester";
import noDefaultHotkeyRule from "../../lib/rules/commands/noDefaultHotkey.js";

const ruleTester = new RuleTester();

ruleTester.run("no-default-hotkey", noDefaultHotkeyRule, {
	valid: [{ code: "this.addCommand({ id: 'foo', name: 'bar' });" }],
	invalid: [
		{
			code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [] });",
			errors: [{ messageId: "hotkeys" }],
		},
		{
			code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [{ modifiers: ['Mod'], key: 'P' }] });",
			errors: [{ messageId: "hotkeys" }],
		},
	],
});
