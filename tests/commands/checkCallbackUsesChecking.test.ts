import { RuleTester } from "@typescript-eslint/rule-tester";
import checkCallbackUsesCheckingRule from "../../lib/rules/commands/checkCallbackUsesChecking.js";

const ruleTester = new RuleTester();

ruleTester.run("check-callback-uses-checking", checkCallbackUsesCheckingRule, {
    valid: [
        {
            name: "checkCallback that returns early when checking is allowed",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: (checking) => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (!view) {
                            return false;
                        }
                        if (!checking) {
                            run(view);
                        }
                        return true;
                    },
                });
            `,
        },
        {
            name: "editorCheckCallback that reads checking is allowed",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    editorCheckCallback(checking, editor) {
                        if (checking) {
                            return editor.somethingSelected();
                        }
                        run(editor);
                    },
                });
            `,
        },
        {
            name: "function expression that reads checking is allowed",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: function (checking) {
                        return checking || run();
                    },
                });
            `,
        },
        {
            name: "rest parameter is not checked",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: (...args) => run(args),
                });
            `,
        },
        {
            name: "callback passed by reference is not checked",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: this.check,
                });
            `,
        },
        {
            name: "plain callback is allowed",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    callback: () => run(),
                });
            `,
        },
    ],
    invalid: [
        {
            name: "checkCallback without parameters is forbidden",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: () => {
                        run();
                        return true;
                    },
                });
            `,
            errors: [
                {
                    messageId: "checking",
                    data: {
                        name: "checkCallback",
                        plainName: "callback",
                    },
                },
            ],
        },
        {
            name: "checkCallback that never reads checking is forbidden",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: (checking: boolean) => {
                        if (this.settings.enabled) {
                            run();
                            return true;
                        }
                        return false;
                    },
                });
            `,
            errors: [
                {
                    messageId: "checking",
                },
            ],
        },
        {
            name: "editorCheckCallback method that never reads checking is forbidden",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    editorCheckCallback(_checking, editor) {
                        run(editor);
                        return true;
                    },
                });
            `,
            errors: [
                {
                    messageId: "checking",
                    data: {
                        name: "editorCheckCallback",
                        plainName: "editorCallback",
                    },
                },
            ],
        },
        {
            name: "a shadowing variable does not count as reading checking",
            code: `
                this.addCommand({
                    id: 'foo',
                    name: 'Foo',
                    checkCallback: function (checking) {
                        const inner = (checking: boolean) => checking;
                        return inner(true);
                    },
                });
            `,
            errors: [
                {
                    messageId: "checking",
                },
            ],
        },
    ],
});
