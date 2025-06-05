import { RuleTester } from "@typescript-eslint/rule-tester";
import detachLeavesRule from "../lib/rules/detachLeaves.js";

const ruleTester = new RuleTester();

ruleTester.run("detach-leaves", detachLeavesRule, {
	valid: [{ code: "class MyPlugin { onunload() { /* nothing */ } }" }],
	invalid: [
		{
			code: 'class MyPlugin { onunload() { this.detachLeavesOfType("foo"); } }',
			errors: [{ messageId: "onunload" }],
			output: "class MyPlugin { onunload() {  } }",
		},
	],
});
