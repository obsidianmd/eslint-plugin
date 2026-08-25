import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noPeriodicNetwork.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-periodic-network", rule, {
	valid: [
		{
			name: "setInterval without network call is allowed",
			code: "setInterval(() => { console.log('tick'); }, 1000);",
		},
		{
			name: "fetch without setInterval is allowed",
			code: "fetch('/api/data');",
		},
		{
			name: "named function ref is allowed (documented limitation)",
			code: "setInterval(pollServer, 1000);",
		},
	],
	invalid: [
		{
			name: "setInterval with fetch in arrow function",
			code: "setInterval(() => { fetch('/api'); }, 60000);",
			errors: [
				{
					messageId: "periodicNetwork",
					data: { api: "fetch" },
				},
			],
		},
		{
			name: "setInterval with requestUrl in function expression",
			code: "setInterval(function() { requestUrl({ url: '/api' }); }, 60000);",
			errors: [
				{
					messageId: "periodicNetwork",
					data: { api: "requestUrl" },
				},
			],
		},
		{
			name: "window.setInterval with fetch",
			code: "window.setInterval(() => { fetch('/api'); }, 60000);",
			errors: [
				{
					messageId: "periodicNetwork",
					data: { api: "fetch" },
				},
			],
		},
		{
			name: "nested fetch inside conditional",
			code: "setInterval(() => { if (condition) { fetch('/api'); } }, 60000);",
			errors: [
				{
					messageId: "periodicNetwork",
					data: { api: "fetch" },
				},
			],
		},
	],
});
