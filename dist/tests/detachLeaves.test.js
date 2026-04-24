import { RuleTester } from "@typescript-eslint/rule-tester";
import detachLeavesRule from "../lib/rules/detachLeaves.js";
const ruleTester = new RuleTester();
ruleTester.run("detach-leaves", detachLeavesRule, {
    valid: [
        {
            name: "onunload without detachLeavesOfType is allowed",
            code: "class MyPlugin { onunload() { /* nothing */ } }",
        },
    ],
    invalid: [
        {
            name: "detachLeavesOfType in onunload is forbidden",
            code: 'class MyPlugin { onunload() { this.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: "class MyPlugin { onunload() {  } }",
        },
    ],
});
