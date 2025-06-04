import { RuleTester } from "@typescript-eslint/rule-tester";
import noDocumentWriteRule from "../lib/rules/noDocumentWrite.js";

const ruleTester = new RuleTester();

ruleTester.run("no-document-write", noDocumentWriteRule, {
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
        doc.write('...');
        doc.writeln('...');
        function documentFunction() : Document {
          return window.document;
        }
        documentFunction().write('...');
        documentFunction().writeln('...');
      `,
			errors: [
				{ messageId: "noDocumentWrite", line: 3, column: 13 },
				{ messageId: "noDocumentWrite", line: 4, column: 13 },
				{ messageId: "noDocumentWrite", line: 8, column: 28 },
				{ messageId: "noDocumentWrite", line: 9, column: 28 },
			],
		},
		{
			code: `
        document.write('...');
        document.writeln('...');
        window.document.write('...');
        window.document.writeln('...');
        // For 'newWindow.document.write', the non-TS part of 'isDocumentObject'
        // might not catch it unless 'newWindow' is specifically named like '*window'.
        // This test case might rely on type information if 'newWindow.document' is 'Document'.
        var newWindow = { document: document };
        newWindow.document.write('...');
        newWindow.document.writeln('...');
      `,
			errors: [
				{ messageId: "noDocumentWrite", line: 2, column: 18 },
				{ messageId: "noDocumentWrite", line: 3, column: 18 },
				{ messageId: "noDocumentWrite", line: 4, column: 25 }, // This was the failing one
				{ messageId: "noDocumentWrite", line: 5, column: 25 },
				{ messageId: "noDocumentWrite", line: 10, column: 28 },
				{ messageId: "noDocumentWrite", line: 11, column: 28 },
			],
		},
		{
			code: `
        document.write();
        document.writeln();
        document.write('arg1', 'arg2');
        document.writeln('arg1', 'arg2');
        var d = window.document;
        d.write();
        d.writeln('a', 'b', 'c');
      `,
			errors: [
				{ messageId: "noDocumentWrite", line: 2, column: 18 },
				{ messageId: "noDocumentWrite", line: 3, column: 18 },
				{ messageId: "noDocumentWrite", line: 4, column: 18 },
				{ messageId: "noDocumentWrite", line: 5, column: 18 },
				{ messageId: "noDocumentWrite", line: 7, column: 11 },
				{ messageId: "noDocumentWrite", line: 8, column: 11 },
			],
		},
	],
});
