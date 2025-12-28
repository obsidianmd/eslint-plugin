import { RuleTester } from "@typescript-eslint/rule-tester";
import preferWindowTimers from "../lib/rules/preferWindowTimers.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-window-timers", preferWindowTimers, {
    valid: [
        // Correct usage with window prefix
        { code: "window.setTimeout(() => {}, 1000);" },
        { code: "window.clearTimeout(timerId);" },
        { code: "window.setInterval(() => {}, 1000);" },
        { code: "window.clearInterval(intervalId);" },
        // Accessing from globalThis is also fine
        { code: "globalThis.setTimeout(() => {}, 1000);" },
        // Method calls on other objects
        { code: "someObj.setTimeout(() => {}, 1000);" },
        { code: "this.setTimeout(() => {}, 1000);" },
    ],
    invalid: [
        {
            code: "setTimeout(() => {}, 1000);",
            errors: [
                {
                    messageId: "useWindowPrefix",
                    data: { name: "setTimeout" },
                },
            ],
            output: "window.setTimeout(() => {}, 1000);",
        },
        {
            code: "clearTimeout(timerId);",
            errors: [
                {
                    messageId: "useWindowPrefix",
                    data: { name: "clearTimeout" },
                },
            ],
            output: "window.clearTimeout(timerId);",
        },
        {
            code: "setInterval(() => {}, 500);",
            errors: [
                {
                    messageId: "useWindowPrefix",
                    data: { name: "setInterval" },
                },
            ],
            output: "window.setInterval(() => {}, 500);",
        },
        {
            code: "clearInterval(intervalId);",
            errors: [
                {
                    messageId: "useWindowPrefix",
                    data: { name: "clearInterval" },
                },
            ],
            output: "window.clearInterval(intervalId);",
        },
        {
            code: `
class MyPlugin {
    onload() {
        const id = setTimeout(() => {
            this.doSomething();
        }, 1000);
    }
}
            `,
            errors: [
                {
                    messageId: "useWindowPrefix",
                    data: { name: "setTimeout" },
                },
            ],
            output: `
class MyPlugin {
    onload() {
        const id = window.setTimeout(() => {
            this.doSomething();
        }, 1000);
    }
}
            `,
        },
    ],
});
