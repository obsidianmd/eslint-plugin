import { RuleTester } from "@typescript-eslint/rule-tester";
import commandsRule from "../lib/rules/commands.js";

const ruleTester = new RuleTester();

ruleTester.run("commands", commandsRule, {
	valid: [{ code: 'app.commands.addCommand({ id: "foo", name: "bar" });' }],
	invalid: [
		{
			code: 'app.commands.addCommand({ id: "command-foo", name: "bar" });',
			errors: [{ messageId: "commandInId" }],
		},
	],
});
