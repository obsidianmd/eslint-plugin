import { RuleTester } from "@typescript-eslint/rule-tester";
import noSampleCode from "../lib/rules/noSampleCode.js";

const ruleTester = new RuleTester();

ruleTester.run("no-sample-code", noSampleCode, {
    valid: [
        {
            name: "custom registerInterval call is allowed",
            code: "this.registerInterval(window.setInterval(() => this.doSomething(), 1000));",
        },
        {
            name: "custom registerDomEvent call is allowed",
            code: "this.registerDomEvent(this.containerEl, 'click', () => this.onClick());",
        },
        {
            // Crashed with "Cannot read properties of undefined (reading 'type')"
            name: "registerInterval callback calling a plain function is allowed",
            code: "this.registerInterval(window.setInterval(() => maybeRotateLog(), 24 * 60 * 60 * 1000));",
        },
        {
            name: "registerDomEvent callback calling a plain function first is allowed",
            code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                handleClick(evt);
            });`,
        },
        {
            name: "registerInterval callback calling an immediately invoked function is allowed",
            code: "this.registerInterval(window.setInterval(() => (() => console.log('setInterval'))(), 1000));",
        },
    ],
    invalid: [
        {
            name: "sample setInterval call is forbidden",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "", // The auto-fix should remove the entire line
        },
        {
            name: "sample registerDomEvent call is forbidden",
            code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                console.log('click', evt);
            });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "", // The auto-fix should remove the entire block
        },
        {
            name: "the sample statement is removed from onload()",
            code: "class MyPlugin extends Plugin { onload() { this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000)); this.addCommand(command); } }",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "class MyPlugin extends Plugin { onload() {  this.addCommand(command); } }",
        },

        // --- The call's value is used, or the call is not a statement of its own: no fix ---
        // Removing the declarator left `const ;`, which does not parse.
        {
            name: "a sample interval whose id is kept is reported without a fix",
            code: "const id = this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample interval assigned to a field is reported without a fix",
            code: "this.intervalId = this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a returned sample interval is reported without a fix",
            code: "function start() { return this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000)); }",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample call as an arrow function body is reported without a fix",
            code: "const start = () => this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        // Removing the statement would make the next one the body of the `if`.
        {
            name: "a sample call as the body of an if is reported without a fix",
            code: `if (debug) this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                console.log('click', evt);
            });
            this.addCommand(command);`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: null,
        },
    ],
});
