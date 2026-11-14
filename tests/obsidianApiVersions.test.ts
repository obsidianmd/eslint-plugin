import assert from "node:assert";
import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, it } from "mocha";
import { rcompare, valid } from "semver";
import ts from "typescript";
import { API_SINCE } from "../lib/obsidianApiVersions.js";
import { collectDeclarationShapes } from "../lib/rules/obsidianDeclarations.js";
import { DECLARATION_HISTORY, DECLARATION_HISTORY_VERSIONS } from "../lib/rules/obsidianDeclarationHistory.js";

const require = createRequire(import.meta.url);

describe("API_SINCE", () => {
    const file = require.resolve("obsidian/obsidian.d.ts");
    const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const shapes = collectDeclarationShapes(sourceFile);

    // The first typings that declare it where the history lists it (undated, or
    // declared before its @since), else its @since.
    const expected = (name: string): string | undefined => {
        const history = DECLARATION_HISTORY[name];
        if (history) {
            return DECLARATION_HISTORY_VERSIONS[Math.min(...history.map(([ranges]) => parseInt(ranges, 10)))];
        }
        const since = (shapes.get(name) ?? []).flatMap(({ since }) => (since && valid(since) ? [since] : []));
        return since.sort(rcompare)[0];
    };

    for (const [name, version] of Object.entries(API_SINCE)) {
        it(`${name}: ${version}`, () => {
            assert.strictEqual(version, expected(name));
        });
    }
});
