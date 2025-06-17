import { RuleTester } from "@typescript-eslint/rule-tester";
import noInlineStylesRule from "../lib/rules/noStaticStylesAssignment.js";

const ruleTester = new RuleTester();

ruleTester.run("no-static-styles-assignment", noInlineStylesRule, {
	valid: [
		// Correct: Using classList
		{ code: "el.classList.add('my-class');" },
		// Allowed: Dynamic style assignment from a variable
		{ code: "const myWidth = '100px'; el.style.width = myWidth;" },
		// Allowed: Dynamic style assignment from a template literal
		{ code: "el.style.transform = `translateX(${offset}px)`;" },
		// Allowed: Dynamic setProperty
		{ code: "el.style.setProperty('--my-var', someValue);" },
		// Allowed: setAttribute for other attributes
		{ code: "el.setAttribute('data-id', '123');" },
		// Allowed: Reading a style is fine
		{ code: "const color = el.style.color;" },
	],
	invalid: [
		// Invalid: Direct property assignment with a literal
		{
			code: "el.style.color = 'red';",
			errors: [
				{
					messageId: "avoidStyleAssignment",
					data: { property: "element.style.color" },
				},
			],
		},
		// Invalid: cssText assignment with a literal
		{
			code: "el.style.cssText = 'font-weight: bold;';",
			errors: [
				{
					messageId: "avoidStyleAssignment",
					data: { property: "element.style.cssText" },
				},
			],
		},
		// Invalid: setProperty with a literal value
		{
			code: "el.style.setProperty('background', 'blue');",
			errors: [
				{
					messageId: "avoidStyleAssignment",
					data: { property: "element.style.setProperty" },
				},
			],
		},
		// Invalid: setAttribute('style', ...) with a literal value
		{
			code: "el.setAttribute('style', 'padding: 10px;');",
			errors: [
				{
					messageId: "avoidStyleAssignment",
					data: { property: "element.setAttribute" },
				},
			],
		},
		// Invalid: Chained member expression
		{
			code: "this.containerEl.style.border = '1px solid black';",
			errors: [
				{
					messageId: "avoidStyleAssignment",
					data: { property: "element.style.border" },
				},
			],
		},
	],
});
