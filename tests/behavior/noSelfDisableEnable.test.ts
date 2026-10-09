import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noSelfDisableEnable.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-self-disable-enable", rule, {
	valid: [
		{
			name: "only disablePlugin without enablePlugin is allowed",
			code: "app.plugins.disablePlugin(this.manifest.id);",
		},
		{
			name: "only enablePlugin without disablePlugin is allowed",
			code: "app.plugins.enablePlugin('some-id');",
		},
		{
			name: "unrelated code is allowed",
			code: "doSomething(); doSomethingElse();",
		},
	],
	invalid: [
		{
			name: "disablePlugin and enablePlugin together is forbidden",
			code: "app.plugins.disablePlugin(this.manifest.id); app.plugins.enablePlugin(this.manifest.id);",
			errors: [
				{ messageId: "selfDisableEnable" },
				{ messageId: "selfDisableEnable" },
			],
		},
		{
			name: "this.app.plugins variant is also forbidden",
			code: "this.app.plugins.disablePlugin(id); this.app.plugins.enablePlugin(id);",
			errors: [
				{ messageId: "selfDisableEnable" },
				{ messageId: "selfDisableEnable" },
			],
		},
	],
});
