import { RuleTester } from "@typescript-eslint/rule-tester";
import preferWindowTimersRule from "../lib/rules/preferWindowTimers.js";
const ruleTester = new RuleTester();
ruleTester.run("prefer-window-timers", preferWindowTimersRule, {
    valid: [
        {
            name: "window.setTimeout is allowed",
            code: "window.setTimeout(() => {}, 100);",
        },
        {
            name: "window.setInterval is allowed",
            code: "window.setInterval(() => {}, 1000);",
        },
        {
            name: "window.clearTimeout is allowed",
            code: "window.clearTimeout(id);",
        },
        {
            name: "window.clearInterval is allowed",
            code: "window.clearInterval(id);",
        },
        {
            name: "window.requestAnimationFrame is allowed",
            code: "window.requestAnimationFrame(() => {});",
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
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "bare setInterval is forbidden",
            code: "setInterval(() => {}, 1000);",
            output: "window.setInterval(() => {}, 1000);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "setInterval" } }],
        },
        {
            name: "bare clearTimeout is forbidden",
            code: "clearTimeout(id);",
            output: "window.clearTimeout(id);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "bare clearInterval is forbidden",
            code: "clearInterval(id);",
            output: "window.clearInterval(id);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearInterval" } }],
        },
        {
            name: "activeWindow.setTimeout is forbidden",
            code: "activeWindow.setTimeout(() => {}, 100);",
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "activeWindow.setInterval is forbidden",
            code: "activeWindow.setInterval(() => {}, 1000);",
            output: "window.setInterval(() => {}, 1000);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "setInterval" } }],
        },
        {
            name: "activeWindow.clearTimeout is forbidden",
            code: "activeWindow.clearTimeout(id);",
            output: "window.clearTimeout(id);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "activeWindow.clearInterval is forbidden",
            code: "activeWindow.clearInterval(id);",
            output: "window.clearInterval(id);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "clearInterval" } }],
        },
        {
            name: "bare requestAnimationFrame is forbidden",
            code: "requestAnimationFrame(() => {});",
            output: "window.requestAnimationFrame(() => {});",
            errors: [{ messageId: "preferWindowTimer", data: { name: "requestAnimationFrame" } }],
        },
        {
            name: "activeWindow.requestAnimationFrame is forbidden",
            code: "activeWindow.requestAnimationFrame(() => {});",
            output: "window.requestAnimationFrame(() => {});",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "requestAnimationFrame" } }],
        },
    ],
});
