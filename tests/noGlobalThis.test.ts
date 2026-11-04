import { RuleTester } from "@typescript-eslint/rule-tester";
import globals from "globals";
import noGlobalThisRule from "../lib/rules/noGlobalThis.js";

const ruleTester = new RuleTester();

ruleTester.run("no-global-this", noGlobalThisRule, {
    valid: [
        {
            name: "typeof globalThis check is allowed",
            code: "if (typeof globalThis !== 'undefined') {}",
        },
        {
            name: "property named global on an object is allowed",
            code: "const obj = { global: 1 }; obj.global;",
        },
        {
            name: "declare global is allowed",
            code: "declare global { var someVar: string; }",
        },
        {
            name: "local variable named global is allowed",
            code: "const global = 1; global;",
        },
        {
            name: "local variable named globalThis is allowed",
            code: "const globalThis = 1; globalThis;",
        },
        {
            name: "variable declaration named globalThis is allowed",
            code: "const globalThis = {};",
        },
        {
            name: "a type-literal property key named global is allowed",
            code: "type Options = { global: boolean };",
        },
        {
            name: "an interface property key named global is allowed",
            code: "interface Options { global: boolean; globalThis?: string }",
        },
        {
            name: "typeof globalThis in a type annotation is allowed",
            code: "let scope: typeof globalThis | undefined;",
        },
        {
            name: "a qualified type through globalThis is allowed",
            code: "type Timer = ReturnType<typeof globalThis.setTimeout>; let t: Timer | undefined;",
        },
        {
            name: "a class member named global is allowed",
            code: "class Settings { global = true; globalThis() { return 1; } }",
        },
        {
            name: "an accessor or an abstract class member named global is allowed",
            code: "class Settings { accessor global = true; } abstract class Base { abstract global: boolean; abstract accessor globalThis: string; }",
        },
        {
            name: "globalThis in an ambient module is allowed",
            code: "declare module 'shim' { export default globalThis; }",
        },
        {
            name: "an enum member named global is allowed",
            code: "enum Scope { global, local }",
        },
        {
            name: "an ambient declaration using globalThis is allowed",
            code: "declare const scope: typeof globalThis;",
        },
        {
            name: "an imported name global is allowed",
            code: "import { global as g } from './scope'; g;",
        },
        {
            name: "an exported name global is allowed",
            code: "const scope = 1; export { scope as global };",
        },
    ],
    invalid: [
        {
            name: "globalThis reference is forbidden",
            code: "globalThis.setTimeout(() => {}, 100);",
            output: "window.setTimeout(() => {}, 100);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "global reference is forbidden",
            code: "global.process;",
            output: "window.process;",
            errors: [{ messageId: "avoidGlobal", data: { name: "global" } }],
        },
        {
            name: "globalThis cast to another type is still forbidden",
            code: "(globalThis as unknown as { x: number }).x;",
            output: "(window as unknown as { x: number }).x;",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a computed key reading globalThis is still forbidden",
            code: "const o = { [globalThis.Symbol.iterator]: 1 };",
            output: "const o = { [window.Symbol.iterator]: 1 };",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "globalThis as a computed key is still forbidden, with a suggestion",
            code: "const o = { [globalThis]: 1 };",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const o = { [window]: 1 };" }],
            }],
        },
        {
            name: "globalThis as a computed member property is still forbidden",
            code: "declare const table: Record<PropertyKey, number>; table[globalThis as never]; declare const any: any; any[globalThis];",
            output: "declare const table: Record<PropertyKey, number>; table[window as never]; declare const any: any; any[globalThis];",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                {
                    messageId: "avoidGlobal",
                    data: { name: "globalThis" },
                    suggestions: [{
                        messageId: "useWindow",
                        data: { name: "globalThis" },
                        output: "declare const table: Record<PropertyKey, number>; table[globalThis as never]; declare const any: any; any[window];",
                    }],
                },
            ],
        },
        {
            name: "a shorthand property keeps its key in the suggestion",
            code: "const o = { globalThis };",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const o = { globalThis: window };" }],
            }],
        },
        {
            name: "a property value that is not shorthand is replaced on its own",
            code: "const o = { scope: globalThis };",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const o = { scope: window };" }],
            }],
        },

        // Fixed: window.<name> has the type <global>.<name> had.
        {
            name: "a property Window has with the same type is fixed",
            code: "globalThis.document.body.empty(); const id = globalThis.crypto.randomUUID();",
            output: "window.document.body.empty(); const id = window.crypto.randomUUID();",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a global of the project's own, which Window does not redeclare, is fixed",
            code: "declare global { var pluginRegistry: Map<string, number>; } globalThis.pluginRegistry.set('a', 1); globalThis.pluginRegistry = new Map();",
            output: "declare global { var pluginRegistry: Map<string, number>; } window.pluginRegistry.set('a', 1); window.pluginRegistry = new Map();",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "typeof a property gets a suggestion, as window.x throws where the probe would be false",
            code: "if (typeof globalThis.crypto === 'undefined') {}",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "if (typeof window.crypto === 'undefined') {}" }],
            }],
        },
        {
            name: "a call whose every signature returns the same type is fixed",
            code: "const query = globalThis.matchMedia('(min-width: 1px)'); globalThis.alert('x');",
            output: "const query = window.matchMedia('(min-width: 1px)'); window.alert('x');",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "clearTimeout with a NodeJS.Timeout is fixed, window.clearTimeout keeps Node's signature",
            code: "declare const timer: NodeJS.Timeout; globalThis.clearTimeout(timer);",
            output: "declare const timer: NodeJS.Timeout; window.clearTimeout(timer);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a callback whose parameter has the same type either way is fixed",
            code: "globalThis.requestAnimationFrame((time) => time);",
            output: "window.requestAnimationFrame((time) => time);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "cancelAnimationFrame with a number handle is fixed",
            code: "declare const id: number; globalThis.cancelAnimationFrame(id);",
            output: "declare const id: number; window.cancelAnimationFrame(id);",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a cast to any or to a type window is assignable to is fixed",
            code: "(globalThis as any).createEl = 1; const scope = globalThis as typeof globalThis;",
            output: "(window as any).createEl = 1; const scope = window as typeof globalThis;",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "globalThis passed to a call whose result is unused is fixed",
            code: "Object.assign(globalThis, { createEl: 1 }); Object.defineProperty(globalThis, 'x', { value: 1 });",
            output: "Object.assign(window, { createEl: 1 }); Object.defineProperty(window, 'x', { value: 1 });",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "an in check gets a suggestion, as in window throws where the probe would be false",
            code: "if ('requestIdleCallback' in globalThis) {}",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "if ('requestIdleCallback' in window) {}" }],
            }],
        },
        {
            name: "after a check that returns when there is no document, it is fixed",
            code: "export function install() { if (typeof document === 'undefined') return; globalThis.document.body.empty(); }",
            output: "export function install() { if (typeof document === 'undefined') return; window.document.body.empty(); }",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "in the branch where window exists, it is fixed",
            code: "export const id = typeof window !== 'undefined' ? globalThis.crypto.randomUUID() : '';",
            output: "export const id = typeof window !== 'undefined' ? window.crypto.randomUUID() : '';",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a property read with a string key is fixed like a dotted one",
            code: "globalThis['document'].body.empty();",
            output: "window['document'].body.empty();",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "globalThis in a namespace, which is runtime code, is fixed",
            code: "namespace Plugin { export const doc = globalThis.document; }",
            output: "namespace Plugin { export const doc = window.document; }",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        // Window has `document` as read-only; a read of it is fixed.
        {
            name: "a read as an assignment's value or in an object literal is fixed",
            code: "declare let current: Document; current = globalThis.document; const o = { doc: globalThis.document };",
            output: "declare let current: Document; current = window.document; const o = { doc: window.document };",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },

        // Suggested: the type changes.
        {
            name: "a used setTimeout gets a suggestion, it returns a number on window",
            code: "class View { timer: ReturnType<typeof globalThis.setTimeout> | null = null; start() { this.timer = globalThis.setTimeout(() => {}, 10); } }",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{
                    messageId: "useWindow",
                    data: { name: "globalThis" },
                    output: "class View { timer: ReturnType<typeof globalThis.setTimeout> | null = null; start() { this.timer = window.setTimeout(() => {}, 10); } }",
                }],
            }],
        },
        {
            name: "a callback that takes its parameter type from setTimeout's signature gets a suggestion",
            code: "globalThis.setTimeout((n) => n, 10, 1);",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "window.setTimeout((n) => n, 10, 1);" }],
            }],
        },
        // window.run() would resolve to Window's overload first, and the
        // callback's `x` would become a string.
        {
            name: "a callback that takes its parameter type from only one of the signatures gets a suggestion",
            code: "declare global { interface Window { run(cb: (x: string) => void): void; } function run(cb: (x: number) => void): void; } export {}; globalThis.run((x) => x);",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{
                    messageId: "useWindow",
                    data: { name: "globalThis" },
                    output: "declare global { interface Window { run(cb: (x: string) => void): void; } function run(cb: (x: number) => void): void; } export {}; window.run((x) => x);",
                }],
            }],
        },
        {
            name: "a cast window does not fit gets a suggestion",
            code: "const globals = globalThis as Record<string, unknown>;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const globals = window as Record<string, unknown>;" }],
            }],
        },
        {
            name: "a cast to globalThis plus more gets a suggestion",
            code: "const assets = globalThis as typeof globalThis & { TesseractCore: unknown };",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const assets = window as typeof globalThis & { TesseractCore: unknown };" }],
            }],
        },
        {
            name: "a property read with a key that is not written out gets a suggestion",
            code: "declare const key: 'document'; globalThis[key].body;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "declare const key: 'document'; window[key].body;" }],
            }],
        },
        {
            name: "a property Window declares but the global scope does not gets a suggestion",
            code: "declare global { interface Window { myPlugin: { id: string } } } export {}; export const id = globalThis.myPlugin.id;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{
                    messageId: "useWindow",
                    data: { name: "globalThis" },
                    output: "declare global { interface Window { myPlugin: { id: string } } } export {}; export const id = window.myPlugin.id;",
                }],
            }],
        },
        {
            name: "globalThis passed to a call whose result is used gets a suggestion",
            code: "const merged = Object.assign(globalThis, { a: 1 });",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const merged = Object.assign(window, { a: 1 });" }],
            }],
        },
        {
            name: "globalThis as the whole branch where window exists gets a suggestion",
            code: "export const scope = typeof window !== 'undefined' ? globalThis : undefined;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "export const scope = typeof window !== 'undefined' ? window : undefined;" }],
            }],
        },
        {
            name: "globalThis stored in a variable gets a suggestion",
            code: "const scope = globalThis; scope.document;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const scope = window; scope.document;" }],
            }],
        },
        {
            name: "a function stored rather than called gets a suggestion",
            code: "const timers = { setTimeout: global.setTimeout };",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "global" },
                suggestions: [{ messageId: "useWindow", data: { name: "global" }, output: "const timers = { setTimeout: window.setTimeout };" }],
            }],
        },
        {
            name: "a write to a property Window redeclares gets a suggestion",
            code: "globalThis.onerror = null;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "window.onerror = null;" }],
            }],
        },
        // Window has `document` and `scrollX` as read-only, with the type the
        // globals have: any write to them gets a suggestion.
        ...[
            ["an assignment", "globalThis.document = doc;"],
            ["an increment", "globalThis.scrollX++;"],
            ["a delete", "delete globalThis.document;"],
            ["a for-of target", "for (globalThis.document of docs) {}"],
            ["a for-in target", "for (globalThis.document in docs) {}"],
            ["an array pattern", "[globalThis.document] = docs;"],
            ["an array pattern's default", "[globalThis.document = doc] = docs;"],
            ["an array pattern's rest", "[...globalThis.document] = docs;"],
            ["an object pattern", "({ doc: globalThis.document } = { doc });"],
        ].map(([form, statement]) => {
            const code = `declare const doc: Document; declare const docs: Document[]; ${statement}`;
            return {
                name: `a write to a read-only property of Window, as ${form}, gets a suggestion`,
                code,
                output: null,
                errors: [{
                    messageId: "avoidGlobal" as const,
                    data: { name: "globalThis" },
                    suggestions: [{ messageId: "useWindow" as const, data: { name: "globalThis" }, output: code.replace("globalThis", "window") }],
                }],
            };
        }),

        // Neither: window.<name> would be wrong.
        {
            name: "a property that does not exist on window is reported only",
            code: "if (!globalThis.MathJax) {}",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "a local named window is not the global, so nothing is offered",
            code: "export async function rebind(remote: { open(): Promise<{ id: string }> }) { const window = await remote.open(); return globalThis.crypto.randomUUID() + window.id; }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "the fallback of a typeof window check is reported only",
            code: "export const win = typeof window !== 'undefined' ? window : globalThis;",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "the branch where window is undefined is reported only",
            code: "export function setTimer(fn: () => void, ms: number) { return typeof window === 'undefined' ? globalThis.setTimeout(fn, ms) : window.setTimeout(fn, ms); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "code after an early return for window is reported only",
            code: "export function timerApi() { if (typeof window !== 'undefined') { return window; } return { setTimeout: global.setTimeout }; }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "global" }, suggestions: [] }],
        },
        {
            name: "a check for window through globalThis is reported only, as window it would throw",
            code: "export const browser = typeof globalThis.window !== 'undefined' || 'document' in globalThis;",
            output: null,
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
            ],
        },
        {
            name: "an in check for the document on its own is reported only, as window it would throw",
            code: "export const hasDocument = 'document' in globalThis;",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "a typeof check for the document through an optional chain is reported only",
            code: "export const hasDocument = typeof globalThis?.document !== 'undefined';",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "code after a check that does not prove window exists is reported only",
            code: "export function now() { const browser = typeof window !== 'undefined'; return browser ? 0 : globalThis.performance.now(); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        // Every other way globalThis can be part of a window check: as
        // `window`, the check would throw where it is false.
        ...[
            ["a string key", "export const hasDocument = typeof globalThis['document'] !== 'undefined';"],
            ["a template literal key", "export const hasDocument = typeof globalThis[`document`] !== 'undefined';"],
            ["an optional string key", "export const hasWindow = typeof globalThis?.['window'] !== 'undefined';"],
            ["parentheses", "export const hasDocument = typeof (globalThis).document !== 'undefined';"],
            ["a cast", "export const hasDocument = typeof (globalThis as any).document !== 'undefined';"],
            ["a non-null assertion", "export const hasDocument = typeof globalThis!.document !== 'undefined';"],
            ["globalThis.window's document", "export const hasDocument = typeof globalThis.window.document !== 'undefined';"],
            ["an optional chain past window", "export const hasDocument = typeof globalThis.window?.document !== 'undefined';"],
            ["an optional chain past self", "export const hasDocument = typeof globalThis.self?.document !== 'undefined';"],
            ["a worker global", "export const inWorker = typeof globalThis.importScripts === 'function';"],
            ["an in check with a template literal", "export const hasDocument = `document` in globalThis;"],
            ["an in check without spaces", "export const hasWindow = 'window'in globalThis;"],
            ["a negated property", "export const noWindow = !globalThis.window;"],
            ["a property as an if test", "if (globalThis.document) { console.log('dom'); }"],
            ["a property before &&", "declare function ready(): boolean; export const go = globalThis.document && ready();"],
            ["a property after && in an if test", "declare const ready: boolean; if (ready && globalThis.window) {}"],
            ["a property before ??", "export const win = globalThis.window ?? null;"],
            ["a property compared with undefined", "export const noDocument = globalThis.document === undefined;"],
            ["a property read with ?.", "export const body = globalThis.document?.body;"],
            ["a negated property with a string key", "export const noWindow = !globalThis['window'];"],
        ].map(([form, code]) => ({
            name: `a window check through globalThis, with ${form}, is reported only`,
            code,
            output: null,
            errors: [{ messageId: "avoidGlobal" as const, data: { name: "globalThis" }, suggestions: [] }],
        })),
        {
            name: "a window check through global, tested on its own, is reported only",
            code: "export const noWindow = !global.window;",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "global" }, suggestions: [] }],
        },
        {
            name: "a typeof check with a key that is not written out gets a suggestion, not a fix",
            code: "declare const key: string; export const has = typeof globalThis[key] !== 'undefined';",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "declare const key: string; export const has = typeof window[key] !== 'undefined';" }],
            }],
        },
        {
            name: "a comment inside a typeof window check does not hide it",
            code: "export const t = typeof /* no DOM */ window === 'undefined' ? globalThis.performance.now() : 0;",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "the branch where a constant says there is no window is reported only",
            code: "const hasWindow = typeof window !== 'undefined'; export function now() { return hasWindow ? 0 : globalThis.performance.now(); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "the branch where a function says there is no window is reported only",
            code: "function hasWindow() { return typeof window !== 'undefined'; } export function now() { if (!hasWindow()) { return globalThis.performance.now(); } return 0; }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
    ],
});

// A probe of the global object for a property that may be missing is written
// to work where it is missing, as in a worker or in Node tests, where
// `window.x` would throw: a suggestion, never a fix.
ruleTester.run("no-global-this on probes of the global object", noGlobalThisRule, {
    valid: [],
    invalid: [
        ...[
            ["typeof global.process", "export const node = typeof global.process !== 'undefined';", "global"],
            ["typeof with ?.", "export const has = typeof globalThis?.crypto !== 'undefined';", "globalThis"],
            ["typeof with a string key", "export const has = typeof globalThis['crypto'] !== 'undefined';", "globalThis"],
            ["typeof through a cast", "export const has = typeof (globalThis as any).MathJax !== 'undefined';", "globalThis"],
            ["typeof a property of a property", "export const has = typeof globalThis.crypto.subtle !== 'undefined';", "globalThis"],
            ["an in check on global", "export const has = 'crypto' in global;", "global"],
            ["an in check through a cast", "export const has = 'crypto' in (globalThis as any);", "globalThis"],
            ["an optional call", "export const id = globalThis.crypto?.randomUUID();", "globalThis"],
            ["a property before ??", "export const later = globalThis.queueMicrotask ?? null;", "globalThis"],
        ].map(([form, code, name]) => ({
            name: `a probe of the global object, as ${form}, gets a suggestion`,
            code,
            output: null,
            errors: [{
                messageId: "avoidGlobal" as const,
                data: { name },
                suggestions: [{ messageId: "useWindow" as const, data: { name }, output: code.replace(name, "window") }],
            }],
        })),
        {
            name: "typeof a call's result is not a probe, and is fixed",
            code: "export const kind = typeof globalThis.crypto.randomUUID();",
            output: "export const kind = typeof window.crypto.randomUUID();",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a property read for its value next to a probe is fixed",
            code: "export const id = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto.randomUUID() : '';",
            output: "export const id = typeof globalThis.crypto !== 'undefined' ? window.crypto.randomUUID() : '';",
            errors: [
                {
                    messageId: "avoidGlobal",
                    data: { name: "globalThis" },
                    suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "export const id = typeof window.crypto !== 'undefined' ? globalThis.crypto.randomUUID() : '';" }],
                },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
    ],
});

// Look-alikes of a window check that are not one: still fixed.
ruleTester.run("no-global-this next to window checks", noGlobalThisRule, {
    valid: [],
    invalid: [
        {
            name: "a test of a property that is not window or document gets a suggestion, as a probe",
            code: "if (!globalThis.crypto) { console.log('no crypto'); }",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "if (!window.crypto) { console.log('no crypto'); }" }],
            }],
        },
        {
            name: "the value after a test of globalThis.document is fixed, the test is not",
            code: "export const body = globalThis.document && globalThis.document.body;",
            output: "export const body = globalThis.document && window.document.body;",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a property of the document read without a test is fixed",
            code: "export const title = globalThis['document'].title;",
            output: "export const title = window['document'].title;",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "an in check for another name with a template literal gets a suggestion, as a probe",
            code: "if (`requestIdleCallback` in globalThis) {}",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "if (`requestIdleCallback` in window) {}" }],
            }],
        },
        {
            name: "the branch where a constant says the window is there is fixed",
            code: "const hasWindow = typeof window !== 'undefined'; export function id() { return hasWindow ? globalThis.crypto.randomUUID() : ''; }",
            output: "const hasWindow = typeof window !== 'undefined'; export function id() { return hasWindow ? window.crypto.randomUUID() : ''; }",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "code after an early return on a missing globalThis.window is fixed",
            code: "export function id() { if (!globalThis.window) return ''; return globalThis.crypto.randomUUID(); }",
            output: "export function id() { if (!globalThis.window) return ''; return window.crypto.randomUUID(); }",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
    ],
});

// Without type information only what cannot change a type is fixed: a cast
// to any or unknown, an argument to a call whose result is unused, and the
// timer calls prefer-window-timers fixes.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("no-global-this without type information", noGlobalThisRule, {
    valid: [],
    invalid: [
        {
            name: "a property gets a suggestion without type information",
            code: "globalThis.document.body;",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "window.document.body;" }],
            }],
        },
        {
            name: "a used setTimeout gets a suggestion without type information",
            code: "const timer = globalThis.setTimeout(() => {}, 10);",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "const timer = window.setTimeout(() => {}, 10);" }],
            }],
        },
        {
            name: "a discarded setTimeout is fixed without type information",
            code: "globalThis.setTimeout(() => {}, 10); global.clearTimeout(0);",
            output: "window.setTimeout(() => {}, 10); window.clearTimeout(0);",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "global" } },
            ],
        },
        {
            name: "cancelAnimationFrame is fixed without type information, like requestAnimationFrame",
            code: "const id = globalThis.requestAnimationFrame(() => {}); globalThis.cancelAnimationFrame(id);",
            output: "const id = window.requestAnimationFrame(() => {}); window.cancelAnimationFrame(id);",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a cast to any and an unused call's argument are fixed without type information",
            code: "(globalThis as any).x = 1; Object.assign(globalThis, {});",
            output: "(window as any).x = 1; Object.assign(window, {});",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a cast to unknown is fixed without type information",
            code: "(globalThis as unknown as { x: number }).x = 1;",
            output: "(window as unknown as { x: number }).x = 1;",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
        },
        {
            name: "a timer function passed on rather than called gets a suggestion without type information",
            code: "run(globalThis.setTimeout);",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "run(window.setTimeout);" }],
            }],
        },
        {
            name: "a local named window is not the global without type information either",
            code: "function f(window) { globalThis.setTimeout(() => {}, 10); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "an in check gets a suggestion without type information",
            code: "if ('requestIdleCallback' in globalThis) {}",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "if ('requestIdleCallback' in window) {}" }],
            }],
        },
        {
            name: "an in check for window with a template literal is reported only without type information",
            code: "export const hasWindow = `window` in globalThis;",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        {
            name: "a discarded timer in the branch without a window is reported only without type information",
            code: "if (!('window'in globalThis)) { globalThis.setTimeout(() => {}, 10); }",
            output: null,
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
                { messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] },
            ],
        },
    ],
});

// A project without the DOM lib has no `window` to write.
const noDomRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/no-dom` },
    },
});

noDomRuleTester.run("no-global-this without the DOM lib", noGlobalThisRule, {
    valid: [],
    invalid: [
        {
            name: "globalThis is reported only when the project declares no window",
            code: "const PILL = Symbol.for('pill'); export const pill = (globalThis as any)[PILL];",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
        },
        // `window.process` compiles as `any`, whatever globalThis.process was.
        {
            name: "a project that declares window as any gets a suggestion",
            code: "declare global { var window: any; } export {}; globalThis.process.exit();",
            output: null,
            errors: [{
                messageId: "avoidGlobal",
                data: { name: "globalThis" },
                suggestions: [{ messageId: "useWindow", data: { name: "globalThis" }, output: "declare global { var window: any; } export {}; window.process.exit();" }],
            }],
        },
    ],
});

// The recommended config declares the browser's globals, and Node's for a
// desktop-only plugin. They are variables without a declaration in the file:
// still the globals.
const globalsRuleTester = new RuleTester({
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
});

globalsRuleTester.run("no-global-this with the recommended config's globals", noGlobalThisRule, {
    valid: [],
    invalid: [
        {
            name: "globalThis and global are fixed",
            code: "globalThis.setTimeout(() => {}, 100); global.process;",
            output: "window.setTimeout(() => {}, 100); window.process;",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "global" } },
            ],
        },
    ],
});
