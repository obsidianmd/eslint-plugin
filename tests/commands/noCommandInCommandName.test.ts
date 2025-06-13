import { RuleTester } from "@typescript-eslint/rule-tester";
import noCommandInNameRule from "../../lib/rules/commands/noCommandInCommandName.js";

const ruleTester = new RuleTester();

ruleTester.run("no-command-in-command-name", noCommandInNameRule, {
	valid: [
		{ code: "this.addCommand({ name: 'Open a new note' });" },
		{ code: "this.addCommand({ name: 'Accommodate the user' });" }, // Contains 'command' but as part of a larger word
	],
	invalid: [
		{
			code: "this.addCommand({ name: 'My Awesome Command' });",
			errors: [{ messageId: "commandInName" }],
		},
		{
			code: "this.addCommand({ name: 'command: do something' });",
			errors: [{ messageId: "commandInName" }],
		},
	],
});
