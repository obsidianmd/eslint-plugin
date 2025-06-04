// tests/all-rules.test.ts
import { RuleTester } from '@typescript-eslint/rule-tester';
import noDocumentWriteRule from '../lib/rules/noDocumentWrite.js';

const ruleTester = new RuleTester();

ruleTester.run("no-document-write", noDocumentWriteRule, {
  valid: [
    // Your valid test cases
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
        const myDoc = documentLikeAPIFunction();
        myDoc.write("test");
        myDoc.writeln("test");
      `,
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
      `,
    },
    {
      code: `
        var myObj = { write: function(...args: any[]) {}, writeln: function(...args: any[]) {} };
        myObj.write();
        myObj.write('test');
        myObj.write('test1', 'test2');
        myObj.writeln();
        myObj.writeln('test');
        myObj.writeln('test1', 'test2');
      `,
    },
  ],
invalid: [
    {
      code: `
        var doc = document;
        doc.write('...');        // Line 3
        doc.writeln('...');      // Line 4
        function documentFunction() : Document {
          return window.document;
        }
        documentFunction().write('...'); // Line 8
        documentFunction().writeln('...'); // Line 9
      `,
      errors: [
        // Line 3: "        doc.write('...');"
        // 8 spaces + "doc" (3) + "." (1) = 12 (0-based). 1-based: 13
        { messageId: "noDocumentWrite", line: 3, column: 13 },
        // Line 4: "        doc.writeln('...');"
        // 8 spaces + "doc" (3) + "." (1) = 12 (0-based). 1-based: 13
        { messageId: "noDocumentWrite", line: 4, column: 13 },
        // Line 8: "        documentFunction().write('...');"
        // 8 spaces + "documentFunction()" (18) + "." (1) = 27 (0-based). 1-based: 28
        { messageId: "noDocumentWrite", line: 8, column: 28 },
        // Line 9: "        documentFunction().writeln('...');"
        // 8 spaces + "documentFunction()" (18) + "." (1) = 27 (0-based). 1-based: 28
        { messageId: "noDocumentWrite", line: 9, column: 28 },
      ],
    },
    {
      code: `
        document.write('...');             // Line 2
        document.writeln('...');           // Line 3
        window.document.write('...');      // Line 4
        window.document.writeln('...');    // Line 5
        // For 'newWindow.document.write', the non-TS part of 'isDocumentObject'
        // might not catch it unless 'newWindow' is specifically named like '*window'.
        // This test case might rely on type information if 'newWindow.document' is 'Document'.
        var newWindow = { document: document }; // Example setup // Line 9
        newWindow.document.write('...');   // Line 10
        newWindow.document.writeln('...'); // Line 11
      `,
      errors: [
        // Line 2: "        document.write('...');"
        // 8 spaces + "document" (8) + "." (1) = 17 (0-based). 1-based: 18
        { messageId: "noDocumentWrite", line: 2, column: 18 },
        // Line 3: "        document.writeln('...');"
        // 8 spaces + "document" (8) + "." (1) = 17 (0-based). 1-based: 18
        { messageId: "noDocumentWrite", line: 3, column: 18 },
        // Line 4: "        window.document.write('...');"
        // 8 spaces + "window" (6) + "." (1) + "document" (8) + "." (1) = 24 (0-based). 1-based: 25
        { messageId: "noDocumentWrite", line: 4, column: 25 }, // This was the failing one
        // Line 5: "        window.document.writeln('...');"
        // 8 spaces + "window" (6) + "." (1) + "document" (8) + "." (1) = 24 (0-based). 1-based: 25
        { messageId: "noDocumentWrite", line: 5, column: 25 },
        // Line 10: "        newWindow.document.write('...');"
        // 8 spaces + "newWindow" (9) + "." (1) + "document" (8) + "." (1) = 27 (0-based). 1-based: 28
        { messageId: "noDocumentWrite", line: 10, column: 28 },
        // Line 11: "        newWindow.document.writeln('...');"
        // 8 spaces + "newWindow" (9) + "." (1) + "document" (8) + "." (1) = 27 (0-based). 1-based: 28
        { messageId: "noDocumentWrite", line: 11, column: 28 },
      ],
    },
    {
      code: `
        document.write();                 // Line 2
        document.writeln();               // Line 3
        document.write('arg1', 'arg2');   // Line 4
        document.writeln('arg1', 'arg2'); // Line 5
        var d = window.document;          // Line 6
        d.write();                        // Line 7
        d.writeln('a', 'b', 'c');         // Line 8
      `,
      errors: [
        // Line 2: "        document.write();" -> 1-based column 18
        { messageId: "noDocumentWrite", line: 2, column: 18 },
        // Line 3: "        document.writeln();" -> 1-based column 18
        { messageId: "noDocumentWrite", line: 3, column: 18 },
        // Line 4: "        document.write('arg1', 'arg2');" -> 1-based column 18
        { messageId: "noDocumentWrite", line: 4, column: 18 },
        // Line 5: "        document.writeln('arg1', 'arg2');" -> 1-based column 18
        { messageId: "noDocumentWrite", line: 5, column: 18 },
        // Line 7: "        d.write();"
        // 8 spaces + "d" (1) + "." (1) = 10 (0-based). 1-based: 11
        { messageId: "noDocumentWrite", line: 7, column: 11 },
        // Line 8: "        d.writeln('a', 'b', 'c');"
        // 8 spaces + "d" (1) + "." (1) = 10 (0-based). 1-based: 11
        { messageId: "noDocumentWrite", line: 8, column: 11 },
      ],
    },
  ],
});