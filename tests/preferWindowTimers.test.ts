import { RuleTester } from "@typescript-eslint/rule-tester";
import globals from "globals";
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
            name: "window.cancelAnimationFrame is allowed",
            code: "window.cancelAnimationFrame(handle);",
        },
        {
            name: "a local function named cancelAnimationFrame is not reported",
            code: "function cancelAnimationFrame(id: number) {} cancelAnimationFrame(1);",
        },
        {
            name: "an imported cancelAnimationFrame is not reported",
            code: "import { cancelAnimationFrame } from './raf'; cancelAnimationFrame(1);",
        },
        {
            name: "cancelAnimationFrame on another window is not reported",
            code: "declare const el: HTMLElement; el.win.cancelAnimationFrame(1); popout.cancelAnimationFrame(2);",
        },
        {
            name: "other functions such as requestIdleCallback are not reported",
            code: "const id = requestIdleCallback(() => {}); cancelIdleCallback(id);",
        },
        {
            name: "other functions on activeWindow are not reported",
            code: "activeWindow.requestIdleCallback(() => {}); activeWindow.open('https://obsidian.md');",
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
            name: "bare cancelAnimationFrame is forbidden",
            code: "cancelAnimationFrame(handle);",
            output: "window.cancelAnimationFrame(handle);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" } }],
        },
        {
            name: "activeWindow.cancelAnimationFrame is forbidden",
            code: "activeWindow.cancelAnimationFrame(handle);",
            output: "window.cancelAnimationFrame(handle);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "cancelAnimationFrame" } }],
        },
        {
            name: "cancelAnimationFrame with a number handle is fixed, it takes a number either way",
            code: "declare const frame: number; cancelAnimationFrame(frame);",
            output: "declare const frame: number; window.cancelAnimationFrame(frame);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" } }],
        },
        {
            name: "a frame requested and cancelled on activeWindow is moved to window together",
            code: "const id = activeWindow.requestAnimationFrame(() => {}); activeWindow.cancelAnimationFrame(id);",
            output: "const id = window.requestAnimationFrame(() => {}); window.cancelAnimationFrame(id);",
            errors: [
                { messageId: "noActiveWindowTimer", data: { name: "requestAnimationFrame" } },
                { messageId: "noActiveWindowTimer", data: { name: "cancelAnimationFrame" } },
            ],
        },
        {
            name: "cancelAnimationFrame is not rewritten to a local named window",
            code: "export function stop(window: { id: number }) { cancelAnimationFrame(window.id); activeWindow.cancelAnimationFrame(window.id); }",
            output: null,
            errors: [
                { messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" }, suggestions: [] },
                { messageId: "noActiveWindowTimer", data: { name: "cancelAnimationFrame" } },
            ],
        },
        {
            name: "cancelAnimationFrame where window may be undefined is reported only",
            code: `export function stop(id: number) { if (typeof window === "undefined") { cancelAnimationFrame(id); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" }, suggestions: [] }],
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
        {
            name: "a typeof window check outside an arrow function or a function expression does not stop the fix",
            code: `const isBrowser = typeof window !== "undefined"; export const later = (fn: () => void) => { setTimeout(fn, 0); }; export const again = function (fn: () => void) { setTimeout(fn, 0); };`,
            output: `const isBrowser = typeof window !== "undefined"; export const later = (fn: () => void) => { window.setTimeout(fn, 0); }; export const again = function (fn: () => void) { window.setTimeout(fn, 0); };`,
            errors: [
                { messageId: "preferWindowTimer", data: { name: "setTimeout" } },
                { messageId: "preferWindowTimer", data: { name: "setTimeout" } },
            ],
        },
        {
            name: "a typeof window check after the call does not stop the fix",
            code: `export function later(fn: () => void) { setTimeout(fn, 0); if (typeof window === "undefined") { return; } }`,
            output: `export function later(fn: () => void) { window.setTimeout(fn, 0); if (typeof window === "undefined") { return; } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a type named window does not hide the global window",
            code: `type window = { id: number }; export function later(fn: () => void) { setTimeout(fn, 0); }`,
            output: `type window = { id: number }; export function later(fn: () => void) { window.setTimeout(fn, 0); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a typeof check of another global does not stop the fix",
            code: `export const hasWindow = typeof window; export function stop(n: number) { if (typeof process === "undefined") { clearTimeout(n); } }`,
            output: `export const hasWindow = typeof window; export function stop(n: number) { if (typeof process === "undefined") { window.clearTimeout(n); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },

        // --- Other ways of checking for a window ---
        {
            name: "the branch where document is undefined is reported only",
            code: `export function later(fn: () => void) { if (typeof document === "undefined") { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the branch where globalThis.document is undefined is reported only",
            code: `export function later(fn: () => void) { if (typeof globalThis.document === "undefined") { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the branch where globalThis?.document is undefined is reported only",
            code: `export function later(fn: () => void) { if (typeof globalThis?.document === "undefined") { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the else branch of an in check for window is reported only",
            code: `export function later(fn: () => void) { if ("window" in globalThis) { window.setTimeout(fn, 0); } else { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the branch where an in check proves the document exists is fixed",
            code: `export function later(fn: () => void) { if ("document" in globalThis) { setTimeout(fn, 0); } }`,
            output: `export function later(fn: () => void) { if ("document" in globalThis) { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a loose == check for an undefined window is reported only",
            code: `export function later(fn: () => void) { if (typeof window == "undefined") { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "the branch of a loose != check where window exists is fixed",
            code: `export function later(fn: () => void) { if (typeof window != "undefined") { setTimeout(fn, 0); } }`,
            output: `export function later(fn: () => void) { if (typeof window != "undefined") { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a negated check for an undefined window is fixed",
            code: `export function later(fn: () => void) { if (!(typeof window === "undefined")) { setTimeout(fn, 0); } }`,
            output: `export function later(fn: () => void) { if (!(typeof window === "undefined")) { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },

        // --- Where the check decides whether the call runs ---
        {
            name: "the right of && after a check that window exists is fixed",
            code: `export function stop(n: number) { typeof window !== "undefined" && clearTimeout(n); }`,
            output: `export function stop(n: number) { typeof window !== "undefined" && window.clearTimeout(n); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "the right of || after a check that window is undefined is fixed",
            code: `export function stop(n: number) { typeof window === "undefined" || clearTimeout(n); }`,
            output: `export function stop(n: number) { typeof window === "undefined" || window.clearTimeout(n); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "the branch of an && condition that includes a check that window exists is fixed",
            code: `export function stop(n: number, ready: boolean) { if (typeof window !== "undefined" && ready) { clearTimeout(n); } }`,
            output: `export function stop(n: number, ready: boolean) { if (typeof window !== "undefined" && ready) { window.clearTimeout(n); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "code after an early return on an || condition that includes a check that window is undefined is fixed",
            code: `export function stop(n: number, ready: boolean) { if (typeof window === "undefined" || !ready) { return; } clearTimeout(n); }`,
            output: `export function stop(n: number, ready: boolean) { if (typeof window === "undefined" || !ready) { return; } window.clearTimeout(n); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "the alternate of a conditional on an undefined window is fixed",
            code: `export const stop = (n: number) => typeof window === "undefined" ? undefined : clearTimeout(n);`,
            output: `export const stop = (n: number) => typeof window === "undefined" ? undefined : window.clearTimeout(n);`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "the else branch of an if on an undefined window is fixed",
            code: `export function stop(n: number) { if (typeof window === "undefined") { console.log("no window"); } else { clearTimeout(n); } }`,
            output: `export function stop(n: number) { if (typeof window === "undefined") { console.log("no window"); } else { window.clearTimeout(n); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "code after a throw when window is undefined is fixed",
            code: `export function stop(n: number) { if (typeof window === "undefined") throw new Error("no window"); clearTimeout(n); }`,
            output: `export function stop(n: number) { if (typeof window === "undefined") throw new Error("no window"); window.clearTimeout(n); }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "code after a continue when window is undefined is fixed",
            code: `export function stop(ids: number[]) { for (const n of ids) { if (typeof window === "undefined") continue; clearTimeout(n); } }`,
            output: `export function stop(ids: number[]) { for (const n of ids) { if (typeof window === "undefined") continue; window.clearTimeout(n); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "code after a break when window is undefined is fixed",
            code: `export function stop(ids: number[]) { for (const n of ids) { if (typeof window === "undefined") break; clearTimeout(n); } }`,
            output: `export function stop(ids: number[]) { for (const n of ids) { if (typeof window === "undefined") break; window.clearTimeout(n); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "code after an if on an undefined window that does not exit is reported only",
            code: `export function stop(n: number) { if (typeof window === "undefined") { console.log("no window"); } clearTimeout(n); }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" }, suggestions: [] }],
        },
        {
            name: "code after an empty if on an undefined window is reported only",
            code: `export function stop(n: number) { if (typeof window === "undefined") {} clearTimeout(n); }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" }, suggestions: [] }],
        },
        {
            name: "code after a nested if that returns when window is undefined is reported only",
            code: `export function stop(n: number, ready: boolean) { if (ready) { if (typeof window === "undefined") return; } clearTimeout(n); }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" }, suggestions: [] }],
        },
        {
            name: "a check in one branch of a conditional does not decide the other branch",
            code: `export const stop = (n: number, ready: boolean) => ready ? typeof window === "undefined" : clearTimeout(n);`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" }, suggestions: [] }],
        },
        {
            name: "clearTimeout with a never argument is still fixed",
            code: `declare const n: never; clearTimeout(n);`,
            output: `declare const n: never; window.clearTimeout(n);`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
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
            name: "clearTimeout with no argument is fixed without type information",
            code: "clearTimeout();",
            output: "window.clearTimeout();",
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "clearTimeout with undefined is fixed without type information",
            code: "clearTimeout(undefined);",
            output: "window.clearTimeout(undefined);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "clearTimeout" } }],
        },
        {
            name: "clearTimeout with a literal other than a number gets a suggestion without type information",
            code: "clearTimeout(null);",
            output: null,
            errors: [{
                messageId: "preferWindowTimer",
                data: { name: "clearTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "clearTimeout" }, output: "window.clearTimeout(null);" }],
            }],
        },
        {
            name: "a discarded setTimeout is fixed without type information",
            code: "setTimeout(() => {}, 10);",
            output: "window.setTimeout(() => {}, 10);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "cancelAnimationFrame with a variable is fixed without type information",
            code: "cancelAnimationFrame(handle);",
            output: "window.cancelAnimationFrame(handle);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" } }],
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
            code: "setTimeout(() => {}, 10); declare const n: number; clearInterval(n); cancelAnimationFrame(n);",
            output: null,
            errors: [
                { messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] },
                { messageId: "preferWindowTimer", data: { name: "clearInterval" }, suggestions: [] },
                { messageId: "preferWindowTimer", data: { name: "cancelAnimationFrame" }, suggestions: [] },
            ],
        },
    ],
});

// The recommended config declares the browser's globals. They are variables
// without a declaration in the file: still the globals.
const globalsRuleTester = new RuleTester({
    languageOptions: { globals: { ...globals.browser, activeWindow: "readonly" } },
});

globalsRuleTester.run("prefer-window-timers with the recommended config's globals", preferWindowTimersRule, {
    valid: [],
    invalid: [
        {
            name: "bare setTimeout is fixed",
            code: "setTimeout(() => {}, 100);",
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "activeWindow.setTimeout is fixed",
            code: "activeWindow.setTimeout(() => {}, 100);",
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "noActiveWindowTimer", data: { name: "setTimeout" } }],
        },
    ],
});
