import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import noDefaultHotkeyRule from "../../lib/rules/commands/noDefaultHotkey.js";

const ruleTester = new RuleTester();

// The error, and the suggestion that removes the hotkeys, giving `output`
const removed = (output: string) => ({ messageId: "hotkeys" as const, suggestions: [{ messageId: "removeHotkeys" as const, output }] });
const notOffered = { messageId: "hotkeys" as const, suggestions: [] };

ruleTester.run("no-default-hotkey", noDefaultHotkeyRule, {
    valid: [
        {
            name: "command without hotkeys is allowed",
            code: "this.addCommand({ id: 'foo', name: 'bar' });",
        },
        {
            name: "command object passed by name is not checked",
            code: "const command = { id: 'foo', name: 'bar', hotkeys: [] }; this.addCommand(command);",
        },
        {
            name: "a computed key that is a variable is not hotkeys",
            code: "this.addCommand({ id: 'foo', name: 'bar', [hotkeys]: [] });",
        },
        {
            name: "another quoted key is not hotkeys",
            code: "this.addCommand({ 'id': 'foo', 'name': 'bar', 'hotkey': [] });",
        },
        {
            name: "only a method call named addCommand is checked",
            code: "this.addCommands({ hotkeys: [] }); addCommand({ hotkeys: [] }); class A { #addCommand(o: object) {} run() { this.#addCommand({ hotkeys: [] }); } }",
        },
        {
            name: "a command given as something other than an object literal is not checked",
            code: "this.addCommand(makeCommand({ hotkeys: [] }));",
        },
    ],
    invalid: [
        {
            name: "command with empty hotkeys array is forbidden",
            code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [] });",
            errors: [removed("this.addCommand({ id: 'foo', name: 'bar' });")],
        },
        {
            name: "command with hotkeys binding is forbidden",
            code: "this.addCommand({ id: 'foo', name: 'bar', hotkeys: [{ modifiers: ['Mod'], key: 'P' }] });",
            errors: [removed("this.addCommand({ id: 'foo', name: 'bar' });")],
        },
        {
            name: "a quoted hotkeys key is forbidden",
            code: "this.addCommand({ \"id\": \"foo\", \"hotkeys\": [] }); this.addCommand({ 'hotkeys': [] }); this.addCommand({ ['hotkeys']: [] });",
            errors: [
                removed("this.addCommand({ \"id\": \"foo\" }); this.addCommand({ 'hotkeys': [] }); this.addCommand({ ['hotkeys']: [] });"),
                removed("this.addCommand({ \"id\": \"foo\", \"hotkeys\": [] }); this.addCommand({}); this.addCommand({ ['hotkeys']: [] });"),
                removed("this.addCommand({ \"id\": \"foo\", \"hotkeys\": [] }); this.addCommand({ 'hotkeys': [] }); this.addCommand({});"),
            ],
        },
        {
            name: "a spread in the command object is skipped, and the hotkeys still checked",
            code: "this.addCommand({ ...base, hotkeys: [] });",
            errors: [{ ...removed("this.addCommand({ ...base });"), line: 1, column: 28, endLine: 1, endColumn: 39 }],
        },
        {
            name: "the suggestion removes the first, a middle or the last property of one line",
            code: "this.addCommand({ hotkeys: [], id: 'a' }); this.addCommand({ id: 'b', hotkeys: [], name: 'B' }); this.addCommand({ id: 'c', hotkeys: [], });",
            errors: [
                removed("this.addCommand({ id: 'a' }); this.addCommand({ id: 'b', hotkeys: [], name: 'B' }); this.addCommand({ id: 'c', hotkeys: [], });"),
                removed("this.addCommand({ hotkeys: [], id: 'a' }); this.addCommand({ id: 'b', name: 'B' }); this.addCommand({ id: 'c', hotkeys: [], });"),
                removed("this.addCommand({ hotkeys: [], id: 'a' }); this.addCommand({ id: 'b', hotkeys: [], name: 'B' }); this.addCommand({ id: 'c', });"),
            ],
        },
        {
            name: "the suggestion removes the line of a property on a line of its own",
            code: [
                "this.addCommand({",
                "    hotkeys: [{ modifiers: ['Mod'], key: 'P' }],",
                "    id: 'open',",
                "    hotkeys: [",
                "        { modifiers: ['Mod', 'Shift'], key: 'O' },",
                "    ],",
                "    name: 'Open',",
                "    hotkeys: [],",
                "});",
            ].join("\n"),
            errors: [
                removed("this.addCommand({\n    id: 'open',\n    hotkeys: [\n        { modifiers: ['Mod', 'Shift'], key: 'O' },\n    ],\n    name: 'Open',\n    hotkeys: [],\n});"),
                removed("this.addCommand({\n    hotkeys: [{ modifiers: ['Mod'], key: 'P' }],\n    id: 'open',\n    name: 'Open',\n    hotkeys: [],\n});"),
                removed("this.addCommand({\n    hotkeys: [{ modifiers: ['Mod'], key: 'P' }],\n    id: 'open',\n    hotkeys: [\n        { modifiers: ['Mod', 'Shift'], key: 'O' },\n    ],\n    name: 'Open',\n});"),
            ],
        },
        {
            name: "the suggestion removes the last property and the comma before it",
            code: "this.addCommand({ id: 'a', hotkeys: [] }); this.addCommand({\n    id: 'b',\n    hotkeys: []\n});",
            errors: [
                removed("this.addCommand({ id: 'a' }); this.addCommand({\n    id: 'b',\n    hotkeys: []\n});"),
                removed("this.addCommand({ id: 'a', hotkeys: [] }); this.addCommand({\n    id: 'b'\n});"),
            ],
        },
        {
            name: "the suggestion empties an object that only has hotkeys",
            code: "this.addCommand({\n    hotkeys: [],\n});",
            errors: [removed("this.addCommand({});")],
        },
        {
            name: "the suggestion keeps the comments next to the property",
            code: [
                "this.addCommand({",
                "    id: 'open', // the ID",
                "    // Ctrl+P by default",
                "    hotkeys: [{ modifiers: ['Mod'], key: 'P' }], // a default",
                "    name: 'Open',",
                "});",
                "this.addCommand({ id: 'close', /* keys */ hotkeys: [] });",
                "this.addCommand({",
                "    id: 'save', // the ID",
                "    hotkeys: [] // a default",
                "});",
                "this.addCommand({",
                "    id: 'quit', // the ID",
                "    hotkeys: []",
                "});",
            ].join("\n"),
            errors: [
                removed([
                    "this.addCommand({",
                    "    id: 'open', // the ID",
                    "    // Ctrl+P by default",
                    "    // a default",
                    "    name: 'Open',",
                    "});",
                    "this.addCommand({ id: 'close', /* keys */ hotkeys: [] });",
                    "this.addCommand({",
                    "    id: 'save', // the ID",
                    "    hotkeys: [] // a default",
                    "});",
                    "this.addCommand({",
                    "    id: 'quit', // the ID",
                    "    hotkeys: []",
                    "});",
                ].join("\n")),
                removed([
                    "this.addCommand({",
                    "    id: 'open', // the ID",
                    "    // Ctrl+P by default",
                    "    hotkeys: [{ modifiers: ['Mod'], key: 'P' }], // a default",
                    "    name: 'Open',",
                    "});",
                    "this.addCommand({ id: 'close' /* keys */ });",
                    "this.addCommand({",
                    "    id: 'save', // the ID",
                    "    hotkeys: [] // a default",
                    "});",
                    "this.addCommand({",
                    "    id: 'quit', // the ID",
                    "    hotkeys: []",
                    "});",
                ].join("\n")),
                removed([
                    "this.addCommand({",
                    "    id: 'open', // the ID",
                    "    // Ctrl+P by default",
                    "    hotkeys: [{ modifiers: ['Mod'], key: 'P' }], // a default",
                    "    name: 'Open',",
                    "});",
                    "this.addCommand({ id: 'close', /* keys */ hotkeys: [] });",
                    "this.addCommand({",
                    "    id: 'save' // the ID",
                    "    // a default",
                    "});",
                    "this.addCommand({",
                    "    id: 'quit', // the ID",
                    "    hotkeys: []",
                    "});",
                ].join("\n")),
                removed([
                    "this.addCommand({",
                    "    id: 'open', // the ID",
                    "    // Ctrl+P by default",
                    "    hotkeys: [{ modifiers: ['Mod'], key: 'P' }], // a default",
                    "    name: 'Open',",
                    "});",
                    "this.addCommand({ id: 'close', /* keys */ hotkeys: [] });",
                    "this.addCommand({",
                    "    id: 'save', // the ID",
                    "    hotkeys: [] // a default",
                    "});",
                    "this.addCommand({",
                    "    id: 'quit' // the ID",
                    "});",
                ].join("\n")),
            ],
        },
        {
            // A comment inside the property would go with it.
            name: "no suggestion where a comment is inside the property or before its comma",
            code: "this.addCommand({ id: 'a', hotkeys: [/* Ctrl+P */] }); this.addCommand({ id: 'b', hotkeys: [] /* none */, name: 'B' }); this.addCommand({ /* only */ hotkeys: [] });",
            errors: [notOffered, notOffered, notOffered],
        },
        {
            name: "the suggestion keeps CRLF line breaks, parentheses and ?.",
            code: "this?.addCommand(({\r\n    id: 'a',\r\n    hotkeys: ([]),\r\n    name: 'A',\r\n}));",
            errors: [removed("this?.addCommand(({\r\n    id: 'a',\r\n    name: 'A',\r\n}));")],
        },
        {
            name: "a shorthand or a method named hotkeys goes too",
            code: "this.addCommand({ id: 'a', hotkeys }); this.addCommand({ id: 'b', get hotkeys() { return []; }, name: 'B' });",
            errors: [
                removed("this.addCommand({ id: 'a' }); this.addCommand({ id: 'b', get hotkeys() { return []; }, name: 'B' });"),
                removed("this.addCommand({ id: 'a', hotkeys }); this.addCommand({ id: 'b', name: 'B' });"),
            ],
        },
    ],
});

new EslintRuleTester().run("no-default-hotkeys in a JavaScript file", noDefaultHotkeyRule as unknown as Rule.RuleModule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion works with ESLint's own parser",
            code: "this.addCommand({\n    id: \"open\",\n    hotkeys: [{ modifiers: [\"Mod\"], key: \"O\" }],\n    callback: () => {},\n});",
            errors: [{
                messageId: "hotkeys",
                suggestions: [{ messageId: "removeHotkeys", output: "this.addCommand({\n    id: \"open\",\n    callback: () => {},\n});" }],
            }],
        },
    ],
});
