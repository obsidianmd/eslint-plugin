import { RuleTester } from "eslint";
import importPlugin from "eslint-plugin-import";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after } from "mocha";
const ruleTester = new RuleTester();
ruleTester.run("import-no-nodejs-modules", importPlugin.rules["no-nodejs-modules"], {
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
            name: "allowed node module is allowed when configured",
            code: "import fs from 'fs';",
            options: [{ allow: ["fs"] }],
        },
    ],
    invalid: [
        {
            name: "importing node:path is forbidden",
            code: "import path from 'node:path';",
            errors: [{ message: 'Do not import Node.js builtin module "node:path"' }],
        },
        {
            name: "importing fs is forbidden",
            code: "import fs from 'fs';",
            errors: [{ message: 'Do not import Node.js builtin module "fs"' }],
        },
        {
            name: "importing child_process is forbidden",
            code: "import { exec } from 'child_process';",
            errors: [{ message: 'Do not import Node.js builtin module "child_process"' }],
        },
        {
            name: "require of node module is forbidden",
            code: "const path = require('path');",
            errors: [{ message: 'Do not import Node.js builtin module "path"' }],
        },
    ],
});
testNoExtraneousDependencies();
function testNoExtraneousDependencies() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eslint-test-"));
    after(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });
    const tmpFilename = path.join(tmpDir, "test.js");
    const extraneousDepsOptions = [{ packageDir: tmpDir }];
    createFakePackage("listed-dep");
    createFakePackage("unlisted-dep");
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
        name: "test-project",
        dependencies: { "listed-dep": "1.0.0" },
    }));
    ruleTester.run("import-no-extraneous-dependencies", importPlugin.rules["no-extraneous-dependencies"], {
        valid: [
            {
                name: "importing listed dependency is allowed",
                code: "import dep from 'listed-dep';",
                filename: tmpFilename,
                options: extraneousDepsOptions,
            },
        ],
        invalid: [
            {
                name: "importing unlisted dependency is forbidden",
                code: "import dep from 'unlisted-dep';",
                filename: tmpFilename,
                options: extraneousDepsOptions,
                errors: [{ message: "'unlisted-dep' should be listed in the project's dependencies. Run 'npm i -S unlisted-dep' to add it" }],
            },
        ],
    });
    function createFakePackage(name) {
        const pkgDir = path.join(tmpDir, "node_modules", name);
        fs.mkdirSync(pkgDir, { recursive: true });
        fs.writeFileSync(path.join(pkgDir, "index.js"), "module.exports = {};");
        fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name, version: "1.0.0", main: "index.js" }));
    }
}
