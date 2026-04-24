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
