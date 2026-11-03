import { RuleTester } from "@typescript-eslint/rule-tester";
import detachLeavesRule from "../lib/rules/detachLeaves.js";

const ruleTester = new RuleTester();

ruleTester.run("detach-leaves", detachLeavesRule, {
    valid: [
        {
            name: "onunload without detachLeavesOfType is allowed",
            code: "class MyPlugin { onunload() { /* nothing */ } }",
        },
        {
            name: "detachLeavesOfType nested in a block is not checked",
            code: 'class MyPlugin { onunload() { if (this.ready) { this.app.workspace.detachLeavesOfType("foo"); } } }',
        },
        {
            name: "detachLeavesOfType in a helper called from onunload is not checked",
            code: 'class MyPlugin { onunload() { this.cleanUp(); } cleanUp() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "onunload as an arrow-function property is not checked",
            code: 'class MyPlugin { onunload = () => { this.app.workspace.detachLeavesOfType("foo"); }; }',
        },
    ],
    invalid: [
        {
            name: "detachLeavesOfType in onunload is forbidden",
            code: 'class MyPlugin { onunload() { this.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: "class MyPlugin { onunload() {  } }",
        },
        {
            name: "detachLeavesOfType on the workspace in onunload is forbidden",
            code: 'class MyPlugin { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: "class MyPlugin { onunload() {  } }",
        },
    ],
});
