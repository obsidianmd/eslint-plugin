import { RuleTester } from "@typescript-eslint/rule-tester";
import noNodejsModules from "../lib/rules/noNodejsModules.js";

const ruleTester = new RuleTester();

ruleTester.run("no-nodejs-modules", noNodejsModules, {
    valid: [
        {
            name: "the else branch of if (!Platform.isDesktop) is guarded",
            code: 'import { Notice, Platform } from "obsidian"; if (!Platform.isDesktop) { new Notice("Desktop only"); } else { const fs = require("fs"); }',
        },
        {
            name: "the alternate of a !Platform.isDesktop ternary is guarded",
            code: 'import { Platform } from "obsidian"; const fs = !Platform.isDesktop ? null : require("fs");',
        },
        {
            name: "the right side of !Platform.isDesktop || is guarded",
            code: 'import { Platform } from "obsidian"; !Platform.isDesktop || window.require("child_process");',
        },
        {
            name: "importing obsidian is allowed",
            code: "import { Plugin } from 'obsidian';",
        },
        {
            name: "importing a relative module is allowed",
            code: "import { helper } from './utils';",
        },
        {
            name: "importing a third-party module is allowed",
            code: "import _ from 'lodash';",
        },
        {
            // A library, tooling repo or standalone CLI has no manifest to
            // carry isDesktopOnly, and used to need a fake one to say so.
            name: "static import is allowed when isDesktopOnly is set",
            code: "import fs from 'node:fs';",
            options: [{ isDesktopOnly: true }],
        },
        {
            name: "unguarded dynamic import() is allowed when isDesktopOnly is set",
            code: "const fs = await import('fs');",
            options: [{ isDesktopOnly: true }],
        },
        {
            name: "dynamic import() inside if (Platform.isDesktop) is allowed",
            code: "if (Platform.isDesktop) { const fs = await import('fs'); }",
        },
        {
            name: "dynamic import() with node: prefix inside if (Platform.isDesktop) is allowed",
            code: "if (Platform.isDesktop) { const path = await import('node:path'); }",
        },
        {
            name: "dynamic import() with Platform.isDesktop && short-circuit is allowed",
            code: "Platform.isDesktop && import('fs');",
        },
        {
            name: "require() inside if (Platform.isDesktop) is allowed",
            code: "if (Platform.isDesktop) { const fs = require('fs'); }",
        },
        {
            name: "require() with Platform.isDesktop && short-circuit is allowed",
            code: "Platform.isDesktop && require('fs');",
        },
        {
            name: "dynamic import() nested inside Platform.isDesktop guard is allowed",
            code: "if (Platform.isDesktop) { if (true) { const fs = await import('fs'); } }",
        },
        {
            name: "dynamic import() in ternary consequent with Platform.isDesktop guard is allowed",
            code: "const module = Platform.isDesktop ? await import('fs') : null;",
        },
        {
            name: "dynamic import() after early throw guard is allowed",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                    const fs = await import('fs');
                }
            `,
        },
        {
            name: "dynamic import() after early return guard is allowed",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        return;
                    }
                    const fs = await import('fs');
                }
            `,
        },
        {
            name: "dynamic import() after early throw in block guard is allowed",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                    const { exec } = await import('child_process');
                }
            `,
        },
        {
            name: "dynamic import() in class method with early throw guard is allowed",
            code: `
                class MyClass {
                    async method() {
                        if (!Platform.isDesktop) {
                            throw new Error('Desktop only');
                        }
                        const os = await import('os');
                    }
                }
            `,
        },
        {
            name: "dynamic import() in arrow function with early throw guard is allowed",
            code: `
                const fn = async () => {
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                    const path = await import('path');
                };
            `,
        },
        {
            name: "dynamic import() with destructuring after early throw guard is allowed",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                    const { exec } = await import('child_process');
                    const { Buffer } = await import('buffer');
                }
            `,
        },
        {
            name: "multiple dynamic imports after early return guard are allowed",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        return;
                    }
                    const pathModule = await import('path');
                    const osModule = await import('os');
                }
            `,
        },
        {
            name: "dynamic import() in nested function with early throw guard is allowed",
            code: `
                async function outer() {
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                    async function inner() {
                        const fs = await import('fs');
                    }
                }
            `,
        },
        {
            name: "dynamic import() with ternary in Platform.isDesktop check is allowed",
            code: `
                const module = Platform.isDesktop ? await import('node:path') : await Promise.reject();
            `,
        },
        {
            name: "dynamic import() with a non-literal module name is not checked",
            code: "const module = await import(moduleName);",
        },
        {
            name: "require() with a non-literal module name is not checked",
            code: "const module = require(moduleName);",
        },
        // Type-only imports and exports are erased when compiling, so they
        // never load the module.
        {
            name: "a type-only import is allowed",
            code: "import type { Stats } from 'node:fs';",
        },
        {
            name: "a type-only default or namespace import is allowed",
            code: "import type fs from 'fs'; import type * as path from 'node:path';",
        },
        {
            name: "an import whose specifiers are all type-only is allowed",
            code: "import { type Stats, type Dirent } from 'node:fs';",
        },
        {
            name: "a type-only re-export is allowed",
            code: "export type { Stats } from 'fs'; export { type Dirent } from 'node:fs'; export type * from 'node:path';",
        },
        {
            name: "a type-only import-equals is allowed",
            code: "import type fs = require('fs');",
        },
        {
            name: "a type query of a built-in module is allowed",
            code: "type Fs = typeof import('fs');",
        },
        // --- require() through the global object ---
        {
            name: "window.require() inside if (Platform.isDesktop) is allowed",
            code: "if (Platform.isDesktop) { const fs = window.require('fs'); }",
        },
        {
            name: "window.require() after an early-return guard is allowed",
            code: `
                function readConfig() {
                    if (!Platform.isDesktop) return;
                    const { readFileSync } = (window as any).require('node:fs');
                }
            `,
        },
        {
            name: "window.require() with Platform.isDesktop && short-circuit is allowed",
            code: "Platform.isDesktop && activeWindow.require('os');",
        },
        {
            name: "window.require() is allowed when isDesktopOnly is set",
            code: "const fs = window.require('fs');",
            options: [{ isDesktopOnly: true }],
        },
        {
            name: "window.require() of a module that is not built into Node.js is allowed",
            code: "const { remote } = window.require('electron'); const obsidian = globalThis.require('obsidian');",
        },
        {
            name: "window.require() with a non-literal module name is not checked",
            code: "const module = window.require(moduleName);",
        },
        {
            name: "require() on another object is not checked",
            code: "electron.remote.require('fs'); remote.require('child_process'); loader.require('path');",
        },
        {
            name: "a local binding named window is not the global window",
            code: "function run(window: { require(id: string): unknown }) { window.require('fs'); }",
        },
        {
            name: "a function other than require, or a method other than require, is not checked",
            code: "declare function load(id: string): unknown; load('fs'); window.load('fs'); window['load']('path'); window[0]('os');",
        },
        {
            name: "dynamic import() of a module that is not built into Node.js is allowed",
            code: "const lodash = await import('lodash'); const local = await import('./fs');",
        },
        {
            name: "require() inside if (Platform.isDesktop && ...) is allowed",
            code: "declare const ready: boolean; if (Platform.isDesktop && ready) { const fs = require('fs'); }",
        },
        {
            name: "require() without an argument, or with a non-string literal, is not checked",
            code: "require(); window.require(); require(42); const m = await import(42);",
        },
        {
            name: "an import-equals of a namespace member is not checked",
            code: "namespace Paths { export const fs = 'fs'; } import fs = Paths.fs;",
        },
        {
            name: "require() after a bare throw guard at the start of a function expression is allowed",
            code: `
                const load = function () {
                    if (!Platform.isDesktop) throw new Error('Desktop only');
                    return require('fs');
                };
            `,
        },
        {
            name: "a default parameter of a function inside a guard is guarded by it",
            code: `
                if (Platform.isDesktop) {
                    const load = (fs = require('fs')) => fs;
                    function read({ path = require('path') } = {}) { return path; }
                }
            `,
        },
        {
            name: "a function in a default parameter is guarded by the guard at its own start",
            code: `
                function setup(load = () => { if (!Platform.isDesktop) return; return require('fs'); }) {
                    return load;
                }
            `,
        },
        {
            name: "a computed Platform key spelled out as a string is the same guard",
            code: `
                if (Platform["isDesktop"]) { require('fs'); }
                Platform[\`isDesktop\`] && require('path');
            `,
        },
    ],
    invalid: [
        {
            name: "a guard at the start of a function does not cover its default parameters",
            code: `
                function load(fs = require('fs')) {
                    if (!Platform.isDesktop) return;
                    return fs;
                }
                const read = (path = require('path')) => {
                    if (!Platform.isDesktop) throw new Error('Desktop only');
                    return path;
                };
                const open = function ({ os = require('os') } = {}, [cp = require('child_process')] = []) {
                    if (!Platform.isDesktop) return;
                    return [os, cp];
                };
                class Store {
                    load(crypto = require('crypto')) {
                        if (!Platform.isDesktop) return;
                        return crypto;
                    }
                }
            `,
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "path" } },
                { messageId: "noNodejs", data: { module: "os" } },
                { messageId: "noNodejs", data: { module: "child_process" } },
                { messageId: "noNodejs", data: { module: "crypto" } },
            ],
        },
        {
            name: "window[`require`]() is forbidden like window['require']()",
            code: "window[`require`]('fs');",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "a computed Platform key named by a variable is not a guard",
            code: `
                const isDesktop = "isMobile";
                if (Platform[isDesktop]) { require('fs'); }
                function load() {
                    if (!Platform[isDesktop]) return;
                    return require('path');
                }
            `,
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "path" } },
            ],
        },
        {
            name: "the branch where !Platform.isDesktop holds is not guarded",
            code: 'import { Platform } from "obsidian"; if (!Platform.isDesktop) { require("fs"); }',
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "static import of node:path is forbidden",
            code: "import path from 'node:path';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "static import of fs is forbidden",
            code: "import fs from 'fs';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "static import of a built-in subpath is forbidden",
            code: "import { readFile } from 'fs/promises';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "an import with a value specifier besides type-only ones is forbidden",
            code: "import { type Stats, readFile } from 'node:fs';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "a side-effect import is forbidden",
            code: "import 'fs';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "a re-export of a value is forbidden",
            code: "export { readFile } from 'fs';",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "a re-export of everything is forbidden",
            code: "export * from 'node:fs'; export * as path from 'node:path';",
            errors: [{ messageId: "noNodejs" }, { messageId: "noNodejs" }],
        },
        {
            name: "an import-equals of a built-in module is forbidden",
            code: "import fs = require('fs');",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "static import of child_process is forbidden",
            code: "import { exec } from 'child_process';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() without guard is forbidden",
            code: "const fs = await import('fs');",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() in alternate branch of Platform.isDesktop is forbidden",
            code: "if (Platform.isDesktop) {} else { await import('fs'); }",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() in ternary alternate when guarded by Platform.isDesktop is forbidden",
            code: "Platform.isDesktop ? null : import('fs');",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "require() of node module without guard is forbidden",
            code: "const path = require('path');",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "require() inside if (!Platform.isDesktop) is forbidden",
            code: "if (!Platform.isDesktop) { require('fs'); }",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() inside if (!Platform.isDesktop) is forbidden",
            code: "if (!Platform.isDesktop) { import('fs'); }",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() without guard in function is forbidden",
            code: `
                async function test() {
                    const fs = await import('fs');
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() after non-early-exit if statement is forbidden",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        console.log('not desktop');
                    }
                    const fs = await import('fs');
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() after if with else clause is forbidden",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        throw new Error('error');
                    } else {
                        console.log('desktop');
                    }
                    const fs = await import('fs');
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() with wrong guard variable is forbidden",
            code: `
                async function test() {
                    if (!SomeOtherCheck.isDesktop) {
                        throw new Error('error');
                    }
                    const fs = await import('fs');
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() in class method without guard is forbidden",
            code: `
                class MyClass {
                    async method() {
                        const fs = await import('fs');
                    }
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "dynamic import() before early throw guard is forbidden",
            code: `
                async function test() {
                    const fs = await import('fs');
                    if (!Platform.isDesktop) {
                        throw new Error('Desktop only');
                    }
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "explicitly setting isDesktopOnly false still reports",
            code: "import fs from 'node:fs';",
            options: [{ isDesktopOnly: false }],
            errors: [{ messageId: "noNodejs" }],
        },
        // --- require() through the global object: only bare require() was checked ---
        {
            name: "window.require() of a built-in module is forbidden",
            code: "const fs = window.require('fs');",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "window.require() through a type assertion is forbidden",
            code: "const { exec } = (window as any).require('child_process'); const path = (<any>window).require('path');",
            errors: [
                { messageId: "noNodejs", data: { module: "child_process" } },
                { messageId: "noNodejs", data: { module: "path" } },
            ],
        },
        {
            name: "globalThis.require(), activeWindow.require(), self.require() and global.require() are forbidden",
            code: "globalThis.require('node:path'); activeWindow.require('os'); self.require('crypto'); global.require('fs/promises');",
            errors: [
                { messageId: "noNodejs", data: { module: "node:path" } },
                { messageId: "noNodejs", data: { module: "os" } },
                { messageId: "noNodejs", data: { module: "crypto" } },
                { messageId: "noNodejs", data: { module: "fs/promises" } },
            ],
        },
        {
            name: "window['require'](), an optional call and a non-null assertion are forbidden",
            code: "window['require']('fs'); window?.require('fs'); window.require?.('fs'); window!.require('fs');",
            errors: [
                { messageId: "noNodejs" },
                { messageId: "noNodejs" },
                { messageId: "noNodejs" },
                { messageId: "noNodejs" },
            ],
        },
        {
            name: "window.require() inside if (!Platform.isDesktop) is forbidden",
            code: "if (!Platform.isDesktop) { window.require('fs'); }",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "window.require() through satisfies is forbidden",
            code: "(window satisfies Window).require('fs');",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "an import or re-export with an empty specifier list still loads the module",
            code: "import {} from 'fs'; export {} from 'node:path';",
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "node:path" } },
            ],
        },
        {
            name: "a default import beside type-only specifiers is forbidden",
            code: "import fs, { type Stats } from 'node:fs';",
            errors: [{ messageId: "noNodejs", data: { module: "node:fs" } }],
        },
        {
            name: "require() in an arrow function with an expression body is forbidden",
            code: "const load = () => require('fs');",
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "a guard on another Platform flag is not a guard",
            code: "if (Platform.isMobile) { require('fs'); } Platform.isMacOS && import('os');",
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "os" } },
            ],
        },
        {
            name: "Platform.isDesktop or another condition is not a guard",
            code: "if (Platform.isDesktop || ready) { require('fs'); } Platform.isDesktop || require('path');",
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "path" } },
            ],
        },
        {
            name: "a unary operator other than ! does not negate Platform.isDesktop",
            code: `
                if (+Platform.isDesktop) {} else { require('fs'); }
                -Platform.isDesktop || require('path');
                function load() {
                    if (-Platform.isDesktop) return;
                    return require('os');
                }
            `,
            errors: [
                { messageId: "noNodejs", data: { module: "fs" } },
                { messageId: "noNodejs", data: { module: "path" } },
                { messageId: "noNodejs", data: { module: "os" } },
            ],
        },
        {
            name: "a guard that is not the first statement of the function is not a guard",
            code: `
                declare function log(): void;
                function load() {
                    log();
                    if (!Platform.isDesktop) return;
                    return require('fs');
                }
            `,
            errors: [{ messageId: "noNodejs", data: { module: "fs" } }],
        },
        {
            name: "dynamic import() with Platform check but no early exit is forbidden",
            code: `
                async function test() {
                    if (!Platform.isDesktop) {
                        // Just logging, not exiting
                        console.log('Not desktop');
                    }
                    const fs = await import('fs');
                }
            `,
            errors: [{ messageId: "noNodejs" }],
        },
    ],
});

// With verbatimModuleSyntax, TypeScript keeps an import or export whose
// specifiers are all inline type-only as `import {} from "fs"`, which still
// loads the module; `import type` is erased either way.
const verbatimRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: "./tests/fixtures/tsconfig.verbatim-module-syntax.json" } },
});

verbatimRuleTester.run("no-nodejs-modules with verbatimModuleSyntax", noNodejsModules, {
    valid: [
        {
            name: "a type-only import is allowed",
            code: "import type { Stats } from 'node:fs'; export type { Dirent } from 'fs';",
        },
    ],
    invalid: [
        {
            name: "an import whose specifiers are all inline type-only is forbidden",
            code: "import { type Stats } from 'node:fs';",
            errors: [{ messageId: "noNodejs" }],
        },
        {
            name: "a re-export whose specifiers are all inline type-only is forbidden",
            code: "export { type Stats } from 'node:fs';",
            errors: [{ messageId: "noNodejs" }],
        },
    ],
});
