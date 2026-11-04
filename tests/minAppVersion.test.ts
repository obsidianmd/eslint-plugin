import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, it } from "mocha";
import { supportsVersion, toVersion } from "../lib/minAppVersion.js";

const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const moduleUrl = new URL("../lib/minAppVersion.ts", import.meta.url).href;

describe("supportsVersion", () => {
    it("compares the option with the version an API needs", () => {
        assert.strictEqual(supportsVersion("1.6.6", "1.6.6"), true);
        assert.strictEqual(supportsVersion("1.7.0", "1.6.6"), true);
        assert.strictEqual(supportsVersion("1.6.5", "1.6.6"), false);
    });

    it("reads a bare x.y as x.y.0", () => {
        assert.strictEqual(supportsVersion("1.7", "1.6.6"), true);
        assert.strictEqual(supportsVersion("1.6", "1.6.6"), false);
    });

    it("cannot tell from an option that is not a version", () => {
        assert.strictEqual(supportsVersion("latest", "1.6.6"), undefined);
        assert.strictEqual(supportsVersion("x99.0.0", "1.6.6"), undefined);
    });

    it("falls back to the manifest in the cwd: this repo's, 0.15.0", () => {
        assert.strictEqual(supportsVersion(undefined, "0.15.0"), true);
        assert.strictEqual(supportsVersion(undefined, "1.6.6"), false);
    });

    it("has toVersion leave anything looser than x.y unread", () => {
        assert.strictEqual(toVersion("1.2.3"), "1.2.3");
        assert.strictEqual(toVersion("0.15"), "0.15.0");
        assert.strictEqual(toVersion("1"), "1.0.0");
        assert.strictEqual(toVersion("1.x"), undefined);
    });
});

// getManifest() reads manifest.json from the process cwd once, so each
// manifest is read by a fresh process whose cwd holds it.
describe("supportsVersion with manifest.json", function () {
    this.timeout(60000);

    async function withManifest(manifest: string | null): Promise<unknown[]> {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "min-app-version-"));
        try {
            if (manifest !== null) {
                fs.writeFileSync(path.join(dir, "manifest.json"), manifest);
            }
            const script = `
                const { supportsVersion } = await import(${JSON.stringify(moduleUrl)});
                console.log(JSON.stringify([
                    supportsVersion(undefined, "1.6.6") ?? null,
                    supportsVersion("1.0.0", "1.6.6") ?? null,
                ]));
            `;
            const { stdout } = await promisify(execFile)(
                process.execPath,
                ["--import", tsxLoader, "--input-type=module", "-e", script],
                { cwd: dir },
            );
            return JSON.parse(stdout.trim().split("\n").pop() ?? "null") as unknown[];
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    }

    it("is unknown without a manifest, and the option still counts", async () => {
        assert.deepStrictEqual(await withManifest(null), [null, false]);
    });

    it("reads the manifest's minAppVersion, which the option overrides", async () => {
        assert.deepStrictEqual(await withManifest(JSON.stringify({ minAppVersion: "1.8.7" })), [true, false]);
    });

    it("is unknown when the manifest's minAppVersion is not a version, or missing", async () => {
        assert.deepStrictEqual(await withManifest(JSON.stringify({ minAppVersion: "latest" })), [null, false]);
        assert.deepStrictEqual(await withManifest(JSON.stringify({ name: "x" })), [null, false]);
    });
});
