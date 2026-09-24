import assert from "node:assert";
import { describe, it } from "mocha";
import type { PluginManifest } from "../types/manifest.js";
import { isManifestDesktopOnly } from "../lib/manifest.js";

// A manifest.json is supplied by the repo being linted -- in the community
// scanner, by whoever submitted the plugin -- and reaches these rules through
// JSON.parse, so isDesktopOnly is a boolean only to TypeScript. Every value
// below is truthy at runtime, and a truthiness test would read each of them as
// desktop-only, which turns no-nodejs-modules off for that repo.
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
