// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RuleTester } from '@typescript-eslint/rule-tester';
import noDocumentWriteRule from '../lib/rules/noDocumentWrite.js';
import parser from '@typescript-eslint/parser';

// NOTE: Type-aware linting is skipped due to lack of support in ESLint v9+ and @typescript-eslint/rule-tester as of June 2025.

const ruleTester = new RuleTester({
    languageOptions: {
        parser,
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

ruleTester.run('no-document-write', noDocumentWriteRule, {
  valid: [
    {
      code: `     
        interface DocumentLikeAPI {
          write: ((arg : string) => void);
          writeln: ((arg : string) => void);
        }
        function documentLikeAPIFunction() : DocumentLikeAPI {
          return {
            write: () => {},
            writeln: () => {},
          };
        }
      `
    },
    {
      code: `
        function documentLikeAPIFunction() {
          return {
            write: function(){},
            writeln: function(){}
          };
        }
        var documentAPI = documentLikeAPIFunction();
        documentAPI.write('...');
        documentAPI.writeln('...');
        documentLikeAPIFunction().write('...');
        documentLikeAPIFunction().writeln('...');
        // wrong # of args
        document.write();
        document.write('', '');
        document.writeln();
        document.writeln('', '');
      `
    }
  ],
  invalid: [
    {
      code: `
      var doc = document; 
        doc.write('...');
         doc.writeln('...');
         function documentFunction() : Document {
           return window.document;
         }
         documentFunction().write('...');
         documentFunction().writeln('...');        
       `,
       errors: [
         { messageId: "default", line: 3 },
         { messageId: "default", line: 4 },
         { messageId: "default", line: 8 },
         { messageId: "default", line: 9 }
       ]
     },
     {
       code: `
         document.write('...');
         document.writeln('...');
         window.document.write('...');
         window.document.writeln('...');
         newWindow.document.write('...');
         newWindow.document.writeln('...');
       `,
       errors: [
         { messageId: "default", line: 2 },
         { messageId: "default", line: 3 },
         { messageId: "default", line: 4 },
         { messageId: "default", line: 5 },
         { messageId: "default", line: 6 },
         { messageId: "default", line: 7 }
       ]
     }
   ]
});