import { RuleTester } from "@typescript-eslint/rule-tester";
import preferActiveWindowTimersRule from "../lib/rules/preferActiveWindowTimers.js";
const ruleTester = new RuleTester();
ruleTester.run("prefer-active-window-timers", preferActiveWindowTimersRule, {
    valid: [
        {
            name: "activeWindow.setTimeout is allowed",
            code: "activeWindow.setTimeout(() => {}, 100);",
        },
        {
            name: "activeWindow.setInterval is allowed",
            code: "activeWindow.setInterval(() => {}, 1000);",
        },
        {
            name: "activeWindow.clearTimeout is allowed",
            code: "activeWindow.clearTimeout(id);",
        },
        {
            name: "activeWindow.clearInterval is allowed",
            code: "activeWindow.clearInterval(id);",
        },
        {
            name: "window.setTimeout is allowed",
            code: "window.setTimeout(() => {}, 100);",
        },
        {
            name: "local function named setTimeout is allowed",
            code: "function setTimeout() {} setTimeout();",
        },
    ],
    invalid: [
        {
            name: "bare setTimeout is forbidden",
            code: "setTimeout(() => {}, 100);",
            output: "activeWindow.setTimeout(() => {}, 100);",
            errors: [{ messageId: "preferActiveWindow", data: { name: "setTimeout" } }],
        },
        {
            name: "bare setInterval is forbidden",
            code: "setInterval(() => {}, 1000);",
            output: "activeWindow.setInterval(() => {}, 1000);",
            errors: [{ messageId: "preferActiveWindow", data: { name: "setInterval" } }],
        },
        {
            name: "bare clearTimeout is forbidden",
            code: "clearTimeout(id);",
            output: "activeWindow.clearTimeout(id);",
            errors: [{ messageId: "preferActiveWindow", data: { name: "clearTimeout" } }],
        },
        {
            name: "bare clearInterval is forbidden",
            code: "clearInterval(id);",
            output: "activeWindow.clearInterval(id);",
            errors: [{ messageId: "preferActiveWindow", data: { name: "clearInterval" } }],
        },
    ],
});
