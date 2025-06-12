import { RuleTester } from "@typescript-eslint/rule-tester";
import platformRule from "../lib/rules/platform.js";

const ruleTester = new RuleTester();

ruleTester.run("platform", platformRule, {
	valid: [
		// Valid uses of window
		{ code: "window.alert('hello');" },
		{ code: "const x = window.innerHeight;" },
		// Valid uses of navigator
		{ code: "navigator.clipboard.writeText('copy');" },
		// Other member expressions
		{ code: "console.log('test');" },
	],
	invalid: [
		// Direct navigator access
		{
			code: "const ua = navigator.userAgent;",
			errors: [{ messageId: "avoidNavigator" }],
		},
		{
			code: "const p = navigator.platform;",
			errors: [{ messageId: "avoidNavigator" }],
		},
		// Nested window.navigator access
		{
			code: "const ua = window.navigator.userAgent;",
			errors: [{ messageId: "avoidNavigator" }],
		},
		{
			code: "const p = window.navigator.platform;",
			errors: [{ messageId: "avoidNavigator" }],
		},
		// Used in a condition
		{
			code: "if (navigator.userAgent.includes('Mac')) {}",
			errors: [{ messageId: "avoidNavigator" }],
		},
	],
});
