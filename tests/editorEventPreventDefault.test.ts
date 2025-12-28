import { RuleTester } from "@typescript-eslint/rule-tester";
import editorEventPreventDefault from "../lib/rules/editorEventPreventDefault.js";

const ruleTester = new RuleTester();

ruleTester.run("editor-event-prevent-default", editorEventPreventDefault, {
    valid: [
        // Correct pattern for editor-drop
        {
            code: `
this.registerEvent(
    this.app.workspace.on('editor-drop', (evt, editor, info) => {
        if (evt.defaultPrevented) return;
        // handle drop
        evt.preventDefault();
    })
);
            `,
        },
        // Correct pattern for editor-paste
        {
            code: `
this.registerEvent(
    this.app.workspace.on('editor-paste', (evt, editor, info) => {
        if (evt.defaultPrevented) return;
        // handle paste
        evt.preventDefault();
    })
);
            `,
        },
        // Block statement return in if
        {
            code: `
workspace.on('editor-drop', (evt, editor) => {
    if (evt.defaultPrevented) {
        return;
    }
    doSomething();
    evt.preventDefault();
});
            `,
        },
        // Function expression instead of arrow function
        {
            code: `
workspace.on('editor-drop', function(evt, editor) {
    if (evt.defaultPrevented) return;
    handleDrop(evt);
    evt.preventDefault();
});
            `,
        },
        // Other events don't need this pattern
        {
            code: `
workspace.on('file-open', (file) => {
    console.log(file);
});
            `,
        },
        {
            code: `
workspace.on('active-leaf-change', (leaf) => {
    updateUI(leaf);
});
            `,
        },
        // Not a workspace.on call
        {
            code: `
element.on('click', (evt) => {
    handleClick(evt);
});
            `,
        },
    ],
    invalid: [
        // Missing both checks
        {
            code: `
workspace.on('editor-drop', (evt, editor) => {
    handleDrop(evt);
});
            `,
            errors: [
                { messageId: "missingDefaultPreventedCheck" },
                { messageId: "missingPreventDefault" },
            ],
        },
        // Missing defaultPrevented check
        {
            code: `
workspace.on('editor-drop', (evt, editor) => {
    handleDrop(evt);
    evt.preventDefault();
});
            `,
            errors: [{ messageId: "missingDefaultPreventedCheck" }],
        },
        // Missing preventDefault call
        {
            code: `
workspace.on('editor-drop', (evt, editor) => {
    if (evt.defaultPrevented) return;
    handleDrop(evt);
});
            `,
            errors: [{ messageId: "missingPreventDefault" }],
        },
        // editor-paste missing both
        {
            code: `
workspace.on('editor-paste', (evt, editor, info) => {
    processPaste(evt.clipboardData);
});
            `,
            errors: [
                { messageId: "missingDefaultPreventedCheck" },
                { messageId: "missingPreventDefault" },
            ],
        },
        // With this.app.workspace
        {
            code: `
this.app.workspace.on('editor-paste', (evt) => {
    doSomething();
});
            `,
            errors: [
                { messageId: "missingDefaultPreventedCheck" },
                { messageId: "missingPreventDefault" },
            ],
        },
        // Function expression missing checks
        {
            code: `
workspace.on('editor-drop', function(evt, editor) {
    drop(evt);
});
            `,
            errors: [
                { messageId: "missingDefaultPreventedCheck" },
                { messageId: "missingPreventDefault" },
            ],
        },
    ],
});
