import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noLocalStorage.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-local-storage", rule, {
	valid: [
		{
			name: "property access on localStorage is allowed",
			code: "localStorage.length;",
		},
		{
			name: "setItem on unrelated object is allowed",
			code: "myStorage.setItem('key', 'value');",
		},
		{
			name: "Obsidian plugin data API is allowed",
			code: "this.plugin.loadData();",
		},
	],
	invalid: [
		{
			name: "localStorage.setItem is flagged",
			code: "localStorage.setItem('key', 'value');",
			errors: [
				{
					messageId: "localStorage",
					data: { api: "localStorage.setItem()" },
				},
			],
		},
		{
			name: "localStorage.getItem is flagged",
			code: "localStorage.getItem('key');",
			errors: [
				{
					messageId: "localStorage",
					data: { api: "localStorage.getItem()" },
				},
			],
		},
		{
			name: "localStorage.removeItem is flagged",
			code: "localStorage.removeItem('key');",
			errors: [
				{
					messageId: "localStorage",
					data: { api: "localStorage.removeItem()" },
				},
			],
		},
		{
			name: "sessionStorage.setItem is flagged",
			code: "sessionStorage.setItem('key', 'value');",
			errors: [
				{
					messageId: "localStorage",
					data: { api: "sessionStorage.setItem()" },
				},
			],
		},
		{
			name: "window.localStorage.setItem is flagged",
			code: "window.localStorage.setItem('key', 'value');",
			errors: [
				{
					messageId: "localStorage",
					data: { api: "localStorage.setItem()" },
				},
			],
		},
	],
});
