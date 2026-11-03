import { RuleTester } from "@typescript-eslint/rule-tester";
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
            name: "typeof a property is fixed",
            code: "if (typeof globalThis.crypto === 'undefined') {}",
            output: "if (typeof window.crypto === 'undefined') {}",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
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
            name: "an in check is fixed",
            code: "if ('requestIdleCallback' in globalThis) {}",
            output: "if ('requestIdleCallback' in window) {}",
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" } }],
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
            name: "code after a check that does not prove window exists is reported only",
            code: "export function now() { const browser = typeof window !== 'undefined'; return browser ? 0 : globalThis.performance.now(); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
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
            name: "a cast to any and an unused call's argument are fixed without type information",
            code: "(globalThis as any).x = 1; Object.assign(globalThis, {});",
            output: "(window as any).x = 1; Object.assign(window, {});",
            errors: [
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
                { messageId: "avoidGlobal", data: { name: "globalThis" } },
            ],
        },
        {
            name: "a local named window is not the global without type information either",
            code: "function f(window) { globalThis.setTimeout(() => {}, 10); }",
            output: null,
            errors: [{ messageId: "avoidGlobal", data: { name: "globalThis" }, suggestions: [] }],
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
    ],
});
