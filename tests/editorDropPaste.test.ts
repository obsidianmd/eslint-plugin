import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
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
            name: "checks are found anywhere in the handler, under any parameter name",
            code: `
                workspace.on('editor-drop', (e, editor) => {
                    const text = read(e);
                    if (e.defaultPrevented) { return; }
                    editor.replaceSelection(text);
                    e.preventDefault();
                });
            `,
        },
        {
            name: "a handler passed by reference is not checked",
            code: "workspace.on('editor-paste', this.onPaste);",
        },
        {
            name: "an arrow function with an expression body is not checked",
            code: "workspace.on('editor-paste', (evt) => handle(evt));",
        },
        {
            name: "a destructured first parameter is not checked",
            code: "workspace.on('editor-drop', ({ dataTransfer }) => { use(dataTransfer); });",
        },
        {
            name: "an event name that is not a string literal is not checked",
            code: "workspace.on(EVENT_NAME, (evt) => { use(evt); });",
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
        {
            name: "optional chaining on the event counts for both",
            code: `
                workspace.on('editor-paste', (evt) => {
                    if (evt?.defaultPrevented) return;
                    evt?.preventDefault();
                });
            `,
        },
        {
            name: "an optional call of preventDefault counts",
            code: `
                workspace.on('editor-drop', (evt) => {
                    if (evt.defaultPrevented) return;
                    evt.preventDefault?.();
                });
            `,
        },
        {
            name: "a non-null assertion or a type assertion on the event counts",
            code: `
                workspace.on('editor-paste', (evt) => {
                    if (evt!.defaultPrevented) return;
                    (evt as ClipboardEvent).preventDefault();
                });
            `,
        },
        {
            name: "defaultPrevented read by destructuring counts",
            code: `
                workspace.on('editor-paste', (evt) => {
                    const { defaultPrevented } = evt;
                    if (defaultPrevented) return;
                    evt.preventDefault();
                });
            `,
        },
        {
            name: "the checks may be in a nested function that sees the parameter",
            code: `
                workspace.on('editor-drop', (evt) => {
                    if (evt.defaultPrevented) return;
                    files(evt).forEach(() => { evt.preventDefault(); });
                });
            `,
        },
        {
            name: "a parameter written with a type annotation is the same parameter",
            code: `
                workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
                    if (evt.defaultPrevented) return;
                    editor.replaceSelection('x');
                    evt.preventDefault();
                });
            `,
        },
        {
            name: "a method other than on is not checked",
            code: "workspace.off('editor-paste', (evt) => { use(evt); }); workspace.trigger('editor-drop', (evt) => { use(evt); });",
        },
        {
            name: "a call that is not a method call is not checked",
            code: "on('editor-paste', (evt) => { use(evt); });",
        },
        {
            name: "an on() call without a handler is not checked",
            code: "workspace.on('editor-paste');",
        },
        {
            name: "a computed property of the event counts",
            code: `
                workspace.on('editor-paste', (evt) => {
                    if (evt["defaultPrevented"]) return;
                    evt["preventDefault"]();
                });
            `,
        },
        {
            name: "satisfies and an angle-bracket type assertion on the event count",
            code: `
                workspace.on('editor-paste', (evt) => {
                    if ((evt satisfies Event).defaultPrevented) return;
                    (<ClipboardEvent>evt).preventDefault();
                });
            `,
        },
        {
            name: "defaultPrevented read by destructuring assignment or under a quoted key counts",
            code: `
                workspace.on('editor-paste', (evt) => {
                    let defaultPrevented;
                    ({ defaultPrevented } = evt);
                    if (defaultPrevented) return;
                    evt.preventDefault();
                });
                workspace.on('editor-drop', (evt) => {
                    const { "defaultPrevented": handled } = evt;
                    if (handled) return;
                    evt.preventDefault();
                });
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
        {
            // "type.defaultPrevented" contains "e.defaultPrevented", and the
            // string contains "e.preventDefault()".
            name: "another object's defaultPrevented and a string do not count",
            code: `
                workspace.on("editor-paste", (e) => {
                    if (type.defaultPrevented) return;
                    log("e.preventDefault()");
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "a comment does not count",
            code: `
                workspace.on("editor-drop", (evt) => {
                    if (ready) {
                        /* evt.defaultPrevented */
                        // evt.preventDefault()
                        handle(evt);
                    }
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "a shadowing parameter of the same name in a nested function does not count",
            code: `
                workspace.on("editor-paste", (evt) => {
                    other.on("x", (evt) => {
                        if (evt.defaultPrevented) return;
                        evt.preventDefault();
                    });
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "a shadowing variable of the same name in a nested block does not count",
            code: `
                workspace.on("editor-drop", (evt) => {
                    if (evt.defaultPrevented) return;
                    for (const evt of queue) { evt.preventDefault(); }
                });
            `,
            errors: [
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "preventDefault read but not called does not count",
            code: `
                workspace.on("editor-paste", (evt) => {
                    if (evt.defaultPrevented) return;
                    const handled = evt.preventDefault;
                });
            `,
            errors: [
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "a property of the event's property does not count",
            code: `
                workspace.on("editor-drop", (evt) => {
                    if (evt.detail.defaultPrevented) return;
                    evt.target.preventDefault();
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "a default value of a later parameter is not the handler's body",
            code: `
                workspace.on("editor-paste", (evt, done = evt.defaultPrevented, stop = evt.preventDefault()) => {
                    use(done, stop);
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "preventDefault passed as an argument is not a call of it",
            code: `
                workspace.on("editor-drop", (evt) => {
                    if (evt.defaultPrevented) return;
                    later(evt.preventDefault);
                });
            `,
            errors: [
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "destructuring other properties, or a computed key, does not count",
            code: `
                workspace.on("editor-paste", (evt) => {
                    const { clipboardData, [defaultPrevented]: value, ...rest } = evt;
                    const [first] = evt;
                    evt.preventDefault();
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
            ],
        },
        {
            name: "a property of another name, plain or computed, does not count",
            code: `
                workspace.on("editor-drop", (evt) => {
                    if (evt.prevented || evt[defaultPrevented]) return;
                    evt[preventDefault]();
                });
            `,
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            // The third argument of on() is the `this` of the handler.
            name: "the handler is the second argument, with a context after it",
            code: "workspace.on('editor-drop', (evt) => { use(evt); }, this);",
            errors: [
                { messageId: "missingDefaultPrevented" },
                { messageId: "missingPreventDefault" },
            ],
        },
        {
            name: "both problems are reported on the handler",
            code: "workspace.on('editor-paste', (evt) => { use(evt); });",
            errors: [
                { messageId: "missingDefaultPrevented", line: 1, column: 30, endLine: 1, endColumn: 52 },
                { messageId: "missingPreventDefault", line: 1, column: 30, endLine: 1, endColumn: 52 },
            ],
        },
    ],
});

// The rule looks for the check anywhere in the handler, so the message must
// not ask for it at the start.
describe("editor-drop-paste messages", () => {
    it("asks for the defaultPrevented check in the handler, not at its start", () => {
        const messages = new Linter().verify("workspace.on(\"editor-paste\", (evt) => { evt.preventDefault(); });", [{
            plugins: { o: { rules: { r: editorDropPasteRule as never } } },
            rules: { "o/r": "error" },
        }]);
        assert.deepStrictEqual(messages.map((m) => m.message), [
            "Check 'evt.defaultPrevented' in the 'editor-paste' handler and return early if another handler already handled the event.",
        ]);
    });
});
