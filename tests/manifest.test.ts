import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, beforeEach, describe, it } from "mocha";
import type { PluginManifest } from "../types/manifest.js";
import { isManifestDesktopOnly, loadManifest } from "../lib/manifest.js";

// A manifest.json is supplied by the repo being linted -- in the community
// scanner, by whoever submitted the plugin -- and reaches these rules through
// JSON.parse, so isDesktopOnly is a boolean only to TypeScript. The malformed
// values up to {} are truthy, so a truthiness test would read each of them as
// desktop-only and turn no-nodejs-modules off for that repo. The falsy values
// after them are the ordinary not-desktop-only cases.
const NOT_DESKTOP_ONLY: unknown[] = [
    "false",
    "true",
    "no",
    1,
    [],
    {},
    false,
    0,
    null,
    undefined,
];

function manifestWith(isDesktopOnly: unknown): PluginManifest {
    return { isDesktopOnly } as unknown as PluginManifest;
}

describe("isManifestDesktopOnly", () => {
    it("is true only for a real boolean true", () => {
        assert.strictEqual(isManifestDesktopOnly(manifestWith(true)), true);
    });

    for (const value of NOT_DESKTOP_ONLY) {
        it(`is false for ${JSON.stringify(value) ?? String(value)}`, () => {
            assert.strictEqual(isManifestDesktopOnly(manifestWith(value)), false);
        });
    }

    it("is false for a manifest with no isDesktopOnly at all", () => {
        assert.strictEqual(isManifestDesktopOnly({} as PluginManifest), false);
    });

    it("is false when there is no manifest", () => {
        assert.strictEqual(isManifestDesktopOnly(null), false);
    });
});

describe("loadManifest", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
    const originalConsoleError = console.error;
    let errors: unknown[][];

    beforeEach(() => {
        errors = [];
        console.error = (...args: unknown[]) => errors.push(args);
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    after(() => {
        fs.rmSync(tmpDir, { recursive: true });
    });

    it("returns the parsed manifest", () => {
        const file = path.join(tmpDir, "valid.json");
        fs.writeFileSync(file, JSON.stringify({ id: "sample" }));
        assert.deepStrictEqual(loadManifest(file), { id: "sample" });
        assert.deepStrictEqual(errors, []);
    });

    it("returns null without reporting when there is no manifest", () => {
        assert.strictEqual(loadManifest(path.join(tmpDir, "missing.json")), null);
        assert.deepStrictEqual(errors, []);
    });

    it("reports a manifest that does not parse", () => {
        const file = path.join(tmpDir, "malformed.json");
        fs.writeFileSync(file, "{");
        assert.strictEqual(loadManifest(file), null);
        assert.strictEqual(errors.length, 1);
    });

    it("reports a manifest that exists but cannot be read", () => {
        const dir = path.join(tmpDir, "directory.json");
        fs.mkdirSync(dir);
        assert.strictEqual(loadManifest(dir), null);
        assert.strictEqual(errors.length, 1);
    });

    it("reports a manifest that is a symlink loop", function () {
        const file = path.join(tmpDir, "loop.json");
        try {
            fs.symlinkSync(file, file);
        } catch {
            this.skip();
        }
        assert.strictEqual(loadManifest(file), null);
        assert.strictEqual(errors.length, 1);
    });
});
