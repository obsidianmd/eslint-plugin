import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/clipboardAccess.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-clipboard-access", rule, {
	valid: [
		{
			name: "different navigator property is allowed",
			code: "navigator.userAgent;",
		},
		{
			name: "unrelated clipboard variable is allowed",
			code: "const clipboard = new MyClipboard();",
		},
		{
			name: "unrelated DOM access is allowed",
			code: "document.getElementById('clipboard');",
		},
		{
			name: "clipboard property on unknown object is allowed",
			code: "myObj.clipboard.readText();",
		},
	],
	invalid: [
		{
			name: "navigator.clipboard.writeText is forbidden",
			code: "navigator.clipboard.writeText('test');",
			errors: [{ messageId: "clipboardAccess", data: { api: "navigator.clipboard" } }],
		},
		{
			name: "navigator.clipboard.readText is forbidden",
			code: "navigator.clipboard.readText();",
			errors: [{ messageId: "clipboardAccess", data: { api: "navigator.clipboard" } }],
		},
		{
			name: "electron.clipboard.readText is forbidden",
			code: "electron.clipboard.readText();",
			errors: [{ messageId: "clipboardAccess", data: { api: "electron.clipboard" } }],
		},
		{
			name: "remote.clipboard.writeText is forbidden",
			code: "remote.clipboard.writeText('test');",
			errors: [{ messageId: "clipboardAccess", data: { api: "remote.clipboard" } }],
		},
		{
			name: "bracket notation navigator['clipboard'] is forbidden",
			code: 'navigator["clipboard"].writeText(\'test\');',
			errors: [{ messageId: "clipboardAccess", data: { api: "navigator.clipboard" } }],
		},
	],
});
