import { RuleTester } from "@typescript-eslint/rule-tester";
import preferActiveWindow from "../lib/rules/preferActiveWindow.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-active-window", preferActiveWindow, {
    valid: [
        // Using activeWindow/activeDocument
        { code: "const width = activeWindow.innerWidth;" },
        { code: "const el = activeDocument.createElement('div');" },
        { code: "activeDocument.body.appendChild(el);" },
        { code: "const selection = activeWindow.getSelection();" },
        // Property access on objects (not global)
        { code: "const w = obj.window;" },
        { code: "const d = this.document;" },
        { code: "const cfg = { window: true, document: false };" },
        // Type annotations
        { code: "function foo(win: Window) {}" },
        { code: "const doc: Document = activeDocument;" },
        // Import/export
        { code: "import { window as win } from 'some-module';" },
    ],
    invalid: [
        // Bare window usage
        {
            code: "const width = window.innerWidth;",
            output: "const width = activeWindow.innerWidth;",
            errors: [{ messageId: "useActiveWindow" }],
        },
        {
            code: "window.addEventListener('resize', handler);",
            output: "activeWindow.addEventListener('resize', handler);",
            errors: [{ messageId: "useActiveWindow" }],
        },
        {
            code: "const selection = window.getSelection();",
            output: "const selection = activeWindow.getSelection();",
            errors: [{ messageId: "useActiveWindow" }],
        },
        // Bare document usage
        {
            code: "const el = document.createElement('div');",
            output: "const el = activeDocument.createElement('div');",
            errors: [{ messageId: "useActiveDocument" }],
        },
        {
            code: "document.body.appendChild(el);",
            output: "activeDocument.body.appendChild(el);",
            errors: [{ messageId: "useActiveDocument" }],
        },
        {
            code: "const query = document.querySelector('.my-class');",
            output: "const query = activeDocument.querySelector('.my-class');",
            errors: [{ messageId: "useActiveDocument" }],
        },
        {
            code: "document.addEventListener('click', handler);",
            output: "activeDocument.addEventListener('click', handler);",
            errors: [{ messageId: "useActiveDocument" }],
        },
        // In class methods
        {
            code: `
class MyPlugin {
    onload() {
        const el = document.createElement('div');
        window.addEventListener('resize', this.onResize);
    }
}
            `,
            output: `
class MyPlugin {
    onload() {
        const el = activeDocument.createElement('div');
        activeWindow.addEventListener('resize', this.onResize);
    }
}
            `,
            errors: [
                { messageId: "useActiveDocument" },
                { messageId: "useActiveWindow" },
            ],
        },
    ],
});
