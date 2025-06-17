import { RuleTester } from "@typescript-eslint/rule-tester";
import noCommandInIdRule from "../../lib/rules/commands/noCommandInCommandId.js";

const ruleTester = new RuleTester();

ruleTester.run("no-command-in-command-id", noCommandInIdRule, {
	valid: [{ code: "this.addCommand({ id: 'open-thing' });" }],
	invalid: [
		{
			code: "this.addCommand({ id: 'open-thing-command' });",
			errors: [{ messageId: "commandInId" }],
		},
		{
			code: "this.addCommand({ id: 'myCommand' });",
			errors: [{ messageId: "commandInId" }],
		},
	],
});
