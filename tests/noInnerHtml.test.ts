// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RuleTester } from "@typescript-eslint/rule-tester";
import noInnerHtmlRule from "../lib/rules/noInnerHtml.js";

const ruleTester = new RuleTester();

ruleTester.run("no-inner-html", noInnerHtmlRule, {
	valid: [
		"var test = element.innerHTML",
		"var test = element.outerHTML",
		"document.body.innerHTML = ''",
		"document.test",
		"element.insertAdjacentHTML()",
		{
			code: `
        class Test {
          innerHTML: string;
          outerHTML: string;
          constructor(test: string) {
              this.innerHTML = test;
              this.outerHTML = test;
          }
        };
        let test = new Test("test");
        test.innerHTML = test;
        test.outerHTML = test;
      `,
		},
	],
	invalid: [
		{
			code: `
         var element = document.getElementById("someId");
         element.innerHTML = 'test';
         element.outerHTML = 'test';
         element.insertAdjacentHTML('beforebegin', 'foo');
       `,
			errors: [
				{ messageId: "noInnerHtml", line: 3, column: 18 },
				{ messageId: "noInnerHtml", line: 4, column: 18 },
				{ messageId: "noInsertAdjacentHTML", line: 5, column: 18 },
			],
		},
		{
			code: `
         declare var element: HTMLElement;
         declare var parent: { child: HTMLElement };
         element.innerHTML = 'test';
         parent.child.innerHTML += 'test';
       `,
			errors: [
				{ messageId: "noInnerHtml", line: 4, column: 18 },
				// Corrected column for parent.child.innerHTML
				{ messageId: "noInnerHtml", line: 5, column: 23 },
			],
		},
		{
			code: `
         declare var element: HTMLElement;
         declare var parent: { child: HTMLElement };
         element.outerHTML = 'test';
         parent.child.outerHTML += 'test';
       `,
			errors: [
				{ messageId: "noInnerHtml", line: 4, column: 18 },
				// Corrected column for parent.child.outerHTML
				{ messageId: "noInnerHtml", line: 5, column: 23 },
			],
		},
		{
			code: `
         declare var element: HTMLElement;
         element.insertAdjacentHTML('beforebegin', 'foo')
       `,
			errors: [
				{ messageId: "noInsertAdjacentHTML", line: 3, column: 18 },
			],
		},
	],
});
