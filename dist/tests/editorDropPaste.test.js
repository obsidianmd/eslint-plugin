import { RuleTester } from "@typescript-eslint/rule-tester";
import editorDropPasteRule from "../lib/rules/editorDropPaste.js";
const ruleTester = new RuleTester();
ruleTester.run("editor-drop-paste", editorDropPasteRule, {
    valid: [
        {
            name: "editor-paste with both checks is allowed",
            code: `
                workspace.on('editor-paste', (evt, editor, info) => {
                    if (evt.defaultPrevented) { return; }
                    editor.replaceSelection('pasted');
                    evt.preventDefault();
                });
            `,
        },
        {
            name: "editor-drop with both checks is allowed",
            code: `
                workspace.on('editor-drop', (evt, editor, info) => {
                    if (evt.defaultPrevented) { return; }
                    editor.replaceSelection('dropped');
                    evt.preventDefault();
                });
            `,
        },
        {
            name: "non-editor events are not checked",
            code: `
                workspace.on('file-open', (file) => {
                    console.log(file);
                });
            `,
        },
        {
            name: "registerEvent wrapping is allowed",
            code: `
                this.registerEvent(
                    this.app.workspace.on('editor-paste', (evt, editor, info) => {
                        if (evt.defaultPrevented) { return; }
                        editor.replaceSelection('pasted');
                        evt.preventDefault();
                    })
                );
            `,
        },
    ],
    invalid: [
        {
            name: "editor-paste missing both checks is forbidden",
            code: `
                workspace.on('editor-paste', (evt, editor, info) => {
                    editor.replaceSelection('pasted');
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented", data: { eventName: "editor-paste" } },
                { messageId: "missingPreventDefault", data: { eventName: "editor-paste" } },
            ],
        },
        {
            name: "editor-drop missing both checks is forbidden",
            code: `
                workspace.on('editor-drop', (evt, editor, info) => {
                    editor.replaceSelection('dropped');
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented", data: { eventName: "editor-drop" } },
                { messageId: "missingPreventDefault", data: { eventName: "editor-drop" } },
            ],
        },
        {
            name: "editor-paste missing defaultPrevented check is forbidden",
            code: `
                workspace.on('editor-paste', (evt, editor, info) => {
                    editor.replaceSelection('pasted');
                    evt.preventDefault();
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented", data: { eventName: "editor-paste" } },
            ],
        },
        {
            name: "editor-drop missing preventDefault call is forbidden",
            code: `
                workspace.on('editor-drop', (evt, editor, info) => {
                    if (evt.defaultPrevented) { return; }
                    editor.replaceSelection('dropped');
                });
            `,
            errors: [
                { messageId: "missingPreventDefault", data: { eventName: "editor-drop" } },
            ],
        },
        {
            name: "editor-paste with function expression missing checks is forbidden",
            code: `
                workspace.on('editor-paste', function(evt, editor, info) {
                    editor.replaceSelection('pasted');
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
    ],
});
