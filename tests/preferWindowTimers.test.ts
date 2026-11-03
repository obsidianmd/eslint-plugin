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
        {
            name: "an imported function named setTimeout is not reported",
            code: "import { setTimeout } from 'node:timers/promises'; await setTimeout(10);",
        },
        {
            name: "cancelAnimationFrame is not reported",
            code: "cancelAnimationFrame(handle);",
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
        {
            name: "a timer stored in a NodeJS.Timeout field gets a suggestion, not a fix",
            code: `class View { timer: NodeJS.Timeout | null = null; start() { this.timer = setTimeout(() => {}, 10); } }`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "setTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "setTimeout" }, output: `class View { timer: NodeJS.Timeout | null = null; start() { this.timer = window.setTimeout(() => {}, 10); } }` }],
            }],
        },
        {
            name: "a timer typed ReturnType<typeof setTimeout> gets a suggestion",
            code: `let t: ReturnType<typeof setTimeout> = setTimeout(() => {}, 10); t;`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "setTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "setTimeout" }, output: `let t: ReturnType<typeof setTimeout> = window.setTimeout(() => {}, 10); t;` }],
            }],
        },
        {
            name: "a returned timer gets a suggestion",
            code: `export function schedule() { return setInterval(() => {}, 10); }`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "setInterval" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "setInterval" }, output: `export function schedule() { return window.setInterval(() => {}, 10); }` }],
            }],
        },
        {
            name: "a timer passed on as an argument gets a suggestion",
            code: `declare function track(t: NodeJS.Timeout): void; track(setTimeout(() => {}, 10));`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "setTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "setTimeout" }, output: `declare function track(t: NodeJS.Timeout): void; track(window.setTimeout(() => {}, 10));` }],
            }],
        },
        {
            name: "clearTimeout with a NodeJS.Timeout argument gets a suggestion",
            code: `declare const t: NodeJS.Timeout; clearTimeout(t);`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "clearTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "clearTimeout" }, output: `declare const t: NodeJS.Timeout; window.clearTimeout(t);` }],
            }],
        },
        {
            name: "clearInterval with a NodeJS.Timeout | undefined argument gets a suggestion",
            code: `declare const t: NodeJS.Timeout | undefined; clearInterval(t);`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "clearInterval" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "clearInterval" }, output: `declare const t: NodeJS.Timeout | undefined; window.clearInterval(t);` }],
            }],
        },
        {
            name: "a discarded timer is still fixed",
            code: `export function later() { setTimeout(() => {}, 10); }`,
            output: `export function later() { window.setTimeout(() => {}, 10); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a voided timer is still fixed",
            code: `void setTimeout(() => {}, 10);`,
            output: `void window.setTimeout(() => {}, 10);`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "clearTimeout with a number argument is still fixed",
            code: `declare const n: number; clearTimeout(n);`,
            output: `declare const n: number; window.clearTimeout(n);`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "clearTimeout with a number | undefined argument is still fixed",
            code: `declare const n: number | undefined; clearTimeout(n);`,
            output: `declare const n: number | undefined; window.clearTimeout(n);`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "clearTimeout with no argument is still fixed",
            code: `clearTimeout();`,
            output: `window.clearTimeout();`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "a used requestAnimationFrame handle is still fixed, it is a number either way",
            code: `const handle = requestAnimationFrame(() => {}); handle;`,
            output: `const handle = window.requestAnimationFrame(() => {}); handle;`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "requestAnimationFrame" } }],
        },
        {
            name: "a local named window, such as a Playwright page, is not the global, so nothing is offered",
            code: `export async function reload(window: { evaluate(fn: () => void): Promise<void> }) { await window.evaluate(() => { setTimeout(() => location.reload(), 0); }); }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "activeWindow is not fixed to a local named window",
            code: `export function start(window: { id: string }) { activeWindow.setTimeout(() => {}, 10); return window.id; }`,
            output: null,
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "the branch where window is undefined is reported only",
            code: `export function later(fn: () => void) { if (typeof window === "undefined") { setTimeout(fn, 0); return; } window.setTimeout(fn, 0); }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the branch where window exists is still fixed",
            code: `export function later(fn: () => void) { if (typeof window !== "undefined") { setTimeout(fn, 0); } }`,
            output: `export function later(fn: () => void) { if (typeof window !== "undefined") { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a typeof window check in another function does not stop the fix",
            code: `export const isBrowser = typeof window !== "undefined"; export function later(fn: () => void) { setTimeout(fn, 0); }`,
            output: `export const isBrowser = typeof window !== "undefined"; export function later(fn: () => void) { window.setTimeout(fn, 0); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
    ],
});

// Without type information a clear*() argument is only known to fit
// window.clearTimeout's number | undefined when it is a number literal or undefined.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("prefer-window-timers without type information", preferWindowTimersRule, {
    valid: [],
    invalid: [
        {
            name: "clearTimeout with a variable gets a suggestion without type information",
            code: "clearTimeout(timer);",
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "clearTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "clearTimeout" }, output: "window.clearTimeout(timer);" }],
            }],
        },
        {
            name: "clearTimeout with a number literal is fixed without type information",
            code: "clearTimeout(0);",
            output: "window.clearTimeout(0);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "a discarded setTimeout is fixed without type information",
            code: "setTimeout(() => {}, 10);",
            output: "window.setTimeout(() => {}, 10);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a local named window is not the global without type information either",
            code: "function reload(window) { setTimeout(() => {}, 10); }",
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
    ],
});

// A project without the DOM lib has no `window` to write.
const noDomRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/no-dom` },
    },
});

noDomRuleTester.run("prefer-window-timers without the DOM lib", preferWindowTimersRule, {
    valid: [],
    invalid: [
        {
            name: "a timer is reported only when the project declares no window",
            code: "setTimeout(() => {}, 10); declare const n: number; clearInterval(n);",
            output: null,
            errors: [
                { messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] },
                { messageId: "preferWindowTimer", data: { name: "clearInterval" }, suggestions: [] },
            ],
        },
    ],
});
