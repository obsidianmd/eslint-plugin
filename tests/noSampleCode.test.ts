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
    ],
});
