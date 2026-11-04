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

        // --- A constant or a function that holds a check ---
        ...[
            ["a constant that says there is no window", `const hasWindow = typeof window !== "undefined"; export function later(fn: () => void) { if (!hasWindow) { setTimeout(fn, 0); } }`],
            ["a let, which can change, even where it says the window is there", `let hasWindow = typeof window !== "undefined"; export function later(fn: () => void) { if (hasWindow) { setTimeout(fn, 0); } }`],
            ["a negated test of globalThis.window", `const noWindow = !globalThis.window; export function later(fn: () => void) { if (noWindow) { setTimeout(fn, 0); } }`],
            ["two checks joined by &&, which does not say which failed", `const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"; export function later(fn: () => void) { if (isBrowser) { setTimeout(fn, 0); } }`],
            ["a function that returns a check", `function hasWindow() { return typeof window !== "undefined"; } export function later(fn: () => void) { if (!hasWindow()) { setTimeout(fn, 0); } }`],
            ["an arrow function that returns an in check", `const hasWindow = () => "window" in globalThis; export function later(fn: () => void) { if (!hasWindow()) { setTimeout(fn, 0); } }`],
            ["a function expression that returns a check", `const hasDocument = function () { return typeof document !== "undefined"; }; export function later(fn: () => void) { if (!hasDocument()) { setTimeout(fn, 0); } }`],
            ["a function that also returns something else", `declare const ready: boolean; function hasWindow() { if (!ready) return false; return typeof window !== "undefined"; } export function later(fn: () => void) { if (hasWindow()) { setTimeout(fn, 0); } }`],
            ["a constant set from such a function", `const hasWindow = () => typeof window !== "undefined"; const browser = hasWindow(); export function later(fn: () => void) { if (!browser) { setTimeout(fn, 0); } }`],
            ["a worker check", `const isWorker = typeof importScripts === "function"; export function later(fn: () => void) { if (isWorker) { setTimeout(fn, 0); } }`],
            ["a worker check that is false, as Node has no worker either", `const isWorker = typeof importScripts === "function"; export function later(fn: () => void) { if (!isWorker) { setTimeout(fn, 0); } }`],
        ].map(([form, code]) => ({
            name: `a timer after ${form} is reported only`,
            code,
            output: null,
            errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" }, suggestions: [] }],
        })),
        {
            name: "the branch where a constant says the window is there is fixed",
            code: `const hasWindow = typeof window !== "undefined"; export function later(fn: () => void) { if (hasWindow) { setTimeout(fn, 0); } }`,
            output: `const hasWindow = typeof window !== "undefined"; export function later(fn: () => void) { if (hasWindow) { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "the branch where a function says the window is there is fixed",
            code: `function hasWindow() { return typeof window !== "undefined"; } export function later(fn: () => void) { if (hasWindow()) { setTimeout(fn, 0); } }`,
            output: `function hasWindow() { return typeof window !== "undefined"; } export function later(fn: () => void) { if (hasWindow()) { window.setTimeout(fn, 0); } }`,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" } }],
        },
        {
            name: "a typeof check against a template literal does not prove the window exists",
            code: "export function later(fn: () => void) { if (typeof window !== `undefined`) { setTimeout(fn, 0); } }",
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },
        {
            name: "a function that calls itself is followed once",
            code: `function hasWindow(): boolean { return typeof window !== "undefined" || hasWindow(); } export function later(fn: () => void) { if (!hasWindow()) { setTimeout(fn, 0); } }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer", data: { name: "setTimeout" }, suggestions: [] }],
        },

        // --- try/catch ---
        // A try that reads the window throws without one: its catch and finally,
        // and the code after it when the catch goes on, run without a window.
        ...[
            ["in the catch of a try that reads document", `try { document.title; } catch { setTimeout(fn, 0); }`],
            ["in the catch of a try that reads window", `try { window.setTimeout(fn, 0); } catch { setTimeout(fn, 0); }`],
            ["in a catch that uses the error, after a read of activeDocument", `try { activeDocument.body.addClass("x"); } catch (e) { console.error(e); setTimeout(fn, 0); }`],
            ["after a try that reads activeWindow and an empty catch", `try { activeWindow.focus(); } catch {} setTimeout(fn, 0);`],
            ["after a try that reads globalThis.document and a catch with a comment", `try { globalThis.document.title; } catch { /* no DOM */ } setTimeout(fn, 0);`],
            ["after a try that reads document and a catch that goes on", `try { document.title; } catch (e) { console.error(e); } setTimeout(fn, 0);`],
            ["in the finally of a try that reads globalThis.window", `try { globalThis.window.focus(); } finally { setTimeout(fn, 0); }`],
            ["in a function made in such a catch", `try { document.title; } catch { queueMicrotask(() => { setTimeout(fn, 0); }); }`],
        ].map(([form, body]) => ({
            name: `a timer ${form} is reported only`,
            code: `export function later(fn: () => void) { ${body} }`,
            output: null,
            errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" }, suggestions: [] }],
        })),
        // A catch that drops the error would hide window.setTimeout() failing.
        ...[
            ["an empty catch", `try { setTimeout(fn, 0); } catch {}`],
            ["a catch whose error is not read", `try { setTimeout(fn, 0); } catch (_error) {}`],
            ["a catch that only returns", `try { setTimeout(fn, 0); } catch { return; }`],
        ].map(([form, body]) => ({
            name: `a timer in a try with ${form} gets a suggestion`,
            code: `export function later(fn: () => void) { ${body} }`,
            output: null,
            errors: [{
                messageId: "preferWindowTimer" as const,
                data: { name: "setTimeout" },
                suggestions: [{
                    messageId: "useWindowTimer" as const,
                    data: { name: "setTimeout" },
                    output: `export function later(fn: () => void) { ${body.replace("setTimeout(fn", "window.setTimeout(fn")} }`,
                }],
            }],
        })),
        {
            name: "activeWindow in a try with an empty catch gets a suggestion",
            code: `export function later(fn: () => void) { try { activeWindow.setTimeout(fn, 0); } catch {} }`,
            output: null,
            errors: [{
                messageId: "noActiveWindowTimer",
                data: { name: "setTimeout" },
                suggestions: [{ messageId: "useWindowTimer", data: { name: "setTimeout" }, output: `export function later(fn: () => void) { try { window.setTimeout(fn, 0); } catch {} }` }],
            }],
        },
        ...[
            ["in a try whose catch uses the error", `try { setTimeout(fn, 0); } catch (e) { console.error(e); }`],
            ["after a try that reads document and a catch that returns", `try { document.title; } catch { return; } setTimeout(fn, 0);`],
            ["after the read of document in the same try", `try { document.title; setTimeout(fn, 0); } catch (e) { console.error(e); }`],
            ["after a try that does not read the window", `try { save(); } catch {} setTimeout(fn, 0);`],
            ["in the catch of a try that reads a property named document", `try { el.document.title; } catch { setTimeout(fn, 0); }`],
            ["in a callback made in a try with an empty catch", `try { el.on("click", () => { setTimeout(fn, 0); }); } catch {}`],
        ].map(([form, body]) => ({
            name: `a timer ${form} is fixed`,
            code: `declare const el: any; declare function save(): void; export function later(fn: () => void) { ${body} }`,
            output: `declare const el: any; declare function save(): void; export function later(fn: () => void) { ${body.replace("setTimeout(fn", "window.setTimeout(fn")} }`,
            errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" } }],
        })),

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
            name: "a unary operator other than ! on the check does not decide it",
            code: `export function stop(n: number) { if (+(typeof window === "undefined")) { clearTimeout(n); } }`,
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

// Every form of window check the rule recognises, each written four ways: with
// single spaces, with a comment between every two tokens, with newlines and
// tabs, and with no space where none is needed. `_` marks where tokens meet.
// In the branch that runs without a window, `window.setTimeout` would throw.
const NO_WINDOW_THEN = [
    ["typeof window", `typeof_window_===_"undefined"`],
    ["typeof (window)", `typeof_(_window_)_===_"undefined"`],
    ["the comparison written the other way round", `"undefined"_===_typeof_window`],
    ["a template literal type", "typeof_window_==_`undefined`"],
    ["typeof document compared with another type", `typeof_document_!==_"object"`],
    ["typeof globalThis.window", `typeof_globalThis_._window_===_"undefined"`],
    ["typeof globalThis?.document", `typeof_globalThis_?._document_===_"undefined"`],
    ["a string key", `typeof_globalThis_[_"document"_]_===_"undefined"`],
    ["a template literal key", "typeof_globalThis_[_`window`_]_===_\"undefined\""],
    ["typeof self.document", `typeof_self_._document_===_"undefined"`],
    ["an optional chain past window", `typeof_globalThis_._window_?._document_===_"undefined"`],
    // TypeScript allows no line break before `as`.
    ["a cast", `typeof_(_globalThis as any_)_._document_===_"undefined"`],
    ["a negated in check", `!_(_"window"_in_globalThis_)`],
    ["a negated in check with a template literal", "!_(_`document`_in_globalThis_)"],
    ["a negated globalThis.window", `!_globalThis_._window`],
    ["a negated global.window", `!_global_._window`],
    ["a negated self.document", `!_self_._document`],
    ["a negated string key", `!_globalThis_[_"document"_]`],
    ["globalThis.window compared with undefined", `globalThis_._window_===_undefined`],
    ["globalThis.document compared loosely with null", `globalThis_._document_==_null`],
    ["globalThis.window compared with void 0", `globalThis_._window_===_void_0`],
    ["typeof importScripts, as in a worker", `typeof_importScripts_===_"function"`],
    ["typeof WorkerGlobalScope, as in a worker", `typeof_WorkerGlobalScope_!==_"undefined"`],
    ["typeof importScripts that is undefined, as Node has no window either", `typeof_importScripts_===_"undefined"`],
    ["an in check for importScripts", `"importScripts"_in_globalThis`],
];
const NO_WINDOW_ELSE = [
    ["an in check", `"window"_in_globalThis`],
    ["globalThis.document", `globalThis_._document`],
    ["typeof window that is defined", `typeof_window_!==_"undefined"`],
];
const SPELLINGS: [string, (condition: string) => string][] = [
    ["single spaces", (condition) => condition.replaceAll("_", " ")],
    ["comments", (condition) => condition.replaceAll("_", " /* no DOM */ ")],
    ["newlines and tabs", (condition) => condition.replaceAll("_", "\n\t")],
    ["no spaces", (condition) => condition.replace(/(.)_(?=(.))/g, (_, before: string, after: string) => (/[\w$]/.test(before) && /[\w$]/.test(after) ? `${before} ` : before))],
];

untypedRuleTester.run("prefer-window-timers in every form of window check", preferWindowTimersRule, {
    valid: [],
    invalid: [
        ...NO_WINDOW_THEN.flatMap(([form, condition]) =>
            SPELLINGS.map(([spelling, spell]) => ({
                name: `the branch without a window, after ${form} with ${spelling}, is reported only`,
                code: `export function later(fn: () => void) { if (${spell(condition)}) { setTimeout(fn, 0); } }`,
                output: null,
                errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" }, suggestions: [] }],
            })),
        ),
        ...NO_WINDOW_ELSE.flatMap(([form, condition]) =>
            SPELLINGS.map(([spelling, spell]) => ({
                name: `the else branch of ${form} with ${spelling} is reported only`,
                code: `export function later(fn: () => void) { if (${spell(condition)}) { window.setTimeout(fn, 0); } else { setTimeout(fn, 0); } }`,
                output: null,
                errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" }, suggestions: [] }],
            })),
        ),
        // The branch where the check proves the window is there, and look-alikes
        // that are not window checks: still fixed.
        ...[
            ["the branch where typeof globalThis with a string key proves the window", `if (typeof globalThis["window"] !== "undefined") { setTimeout(fn, 0); }`],
            ["the branch where globalThis.window is there", `if (globalThis.window) { setTimeout(fn, 0); }`],
            ["the branch where globalThis.document is not undefined", `if (globalThis.document !== undefined) { setTimeout(fn, 0); }`],
            ["the branch where globalThis.document is not null", `if (globalThis.document != null) { setTimeout(fn, 0); }`],
            ["code after an early return on a missing globalThis.window", `if (!globalThis.window) return; setTimeout(fn, 0);`],
            ["code after an early return on a missing self.document", `if (!self.document) { return; } setTimeout(fn, 0);`],
            ["a test of another property of globalThis", `if (!globalThis.crypto) { setTimeout(fn, 0); }`],
            ["a test of window.document, which already needs a window", `if (!window.document) { setTimeout(fn, 0); }`],
            ["typeof a property of window, which already needs a window", `if (typeof window.app === "undefined") { setTimeout(fn, 0); }`],
            ["an in check for another name", "if (!(`requestIdleCallback` in globalThis)) { setTimeout(fn, 0); }"],
        ].map(([form, body]) => ({
            name: `${form} is fixed`,
            code: `export function later(fn: () => void) { ${body} }`,
            output: `export function later(fn: () => void) { ${body.replace("setTimeout(fn", "window.setTimeout(fn")} }`,
            errors: [{ messageId: "preferWindowTimer" as const, data: { name: "setTimeout" } }],
        })),
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
