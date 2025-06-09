import { RuleTester } from "@typescript-eslint/rule-tester";
import noSampleCode from "../lib/rules/noSampleCode.js";

const ruleTester = new RuleTester();

ruleTester.run("no-sample-code", noSampleCode, {
	valid: [
		// Valid: A different, legitimate registerInterval call
		{
			code: "this.registerInterval(window.setInterval(() => this.doSomething(), 1000));",
		},
		// Valid: A different, legitimate registerDomEvent call
		{
			code: "this.registerDomEvent(this.containerEl, 'click', () => this.onClick());",
		},
	],
	invalid: [
		// Invalid: The sample setInterval call
		{
			code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
			errors: [{ messageId: "removeSampleInterval" }],
			output: "", // The auto-fix should remove the entire line
		},
		// Invalid: The sample registerDomEvent call
		{
			code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                console.log('click', evt);
            });`,
			errors: [{ messageId: "removeSampleDomEvent" }],
			output: "", // The auto-fix should remove the entire block
		},
	],
});
