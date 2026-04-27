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
            name: "dynamic import() nested inside Platform.isDesktop guard is allowed",
            code: "if (Platform.isDesktop) { if (true) { const fs = await import('fs'); } }",
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
            name: "require() of node module is always forbidden",
            code: "const path = require('path');",
            errors: [{ messageId: "noNodejsRequire" }],
        },
        {
            name: "require() inside Platform.isDesktop guard is still forbidden",
            code: "if (Platform.isDesktop) { require('fs'); }",
            errors: [{ messageId: "noNodejsRequire" }],
        },
    ],
});