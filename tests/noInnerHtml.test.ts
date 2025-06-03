// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RuleTester } from '@typescript-eslint/rule-tester';
import noInnerHtmlRule from '../lib/rules/noInnerHtml.js';
import parser from '@typescript-eslint/parser';
import path from "path";
const ruleId = path.parse(__filename).name;
const rule = require(path.join("../../../lib/rules/", ruleId));
const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

// NOTE: Type-aware linting is skipped due to lack of support in ESLint v9+ and @typescript-eslint/rule-tester as of June 2025.

ruleTester.run(ruleId, rule, {
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
      `
    }
  ],
   //Skipped invalid tests due to lack of type-aware linting support in ESLint v9+ and @typescript-eslint/rule-tester as of June 2025.
   invalid: [
     // TypeScript with full type information
     {
       code: `
         var element = document.getElementById(id);
         element.innerHTML = 'test';
         element.outerHTML = 'test';
         element.insertAdjacentHTML('beforebegin', 'foo');
       `,
       errors: [
         { messageId: "noInnerHtml", line: 3 },
         { messageId: "noInnerHtml", line: 4 },
         { messageId: "noInsertAdjacentHTML", line: 5 }
       ]
     },
     {
       code: `
         element.innerHTML = 'test';
         parent.child.innerHTML += 'test';
       `,
       errors: [
         { messageId: "noInnerHtml", line: 2 },
         { messageId: "noInnerHtml", line: 3 }
       ]
     },
     {
       code: `
         element.outerHTML = 'test';
         parent.child.outerHTML += 'test';
       `,
       errors: [
         { messageId: "noInnerHtml", line: 2 },
         { messageId: "noInnerHtml", line: 3 }
       ]
     },
    {
       code: "element.insertAdjacentHTML('beforebegin', 'foo')",
       errors: [{ messageId: "noInsertAdjacentHTML", line: 1 }]
     }
   ]
});