import { RuleTester } from "@typescript-eslint/rule-tester";
import noNodejsModules from "../lib/rules/noNodejsModules.js";

const ruleTester = new RuleTester();

ruleTester.run("no-nodejs-modules", noNodejsModules, {
    valid: [
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
    ],
    invalid: [
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
