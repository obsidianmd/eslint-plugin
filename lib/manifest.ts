import fs from "node:fs";
import { PluginManifest } from "../types/manifest.js";

let cachedManifest: PluginManifest | null | undefined;

export function getManifest(): PluginManifest | null {
    if (cachedManifest !== undefined) {
        return cachedManifest;
    }

    // A library, a tooling repo or a standalone CLI legitimately has no
    // manifest, so its absence is not an error and must not print anything --
    // it used to write to console.error on every lint run in such a repo. A
    // manifest that exists but does not parse is a real defect and still
    // reports.
    if (!fs.existsSync("manifest.json")) {
        cachedManifest = null;
        return cachedManifest;
    }

    try {
        const data = fs.readFileSync("manifest.json", "utf8");
        cachedManifest = JSON.parse(data);
        return cachedManifest as PluginManifest;
    } catch (err) {
        console.error("Failed to load JSON file:", err);
        cachedManifest = null;
        return cachedManifest;
    }
}

/**
 * Whether a manifest says its plugin is desktop-only.
 *
 * A manifest.json belongs to the repo being linted, so `isDesktopOnly` is a
 * `boolean` only to TypeScript -- at runtime it is whatever the file holds.
 * `"false"`, `1`, `[]` and `{}` are all truthy, so a truthiness test lets a
 * malformed field turn a rule off for the very repo that shipped it. Only a
 * real `true` counts.
 */
export function isManifestDesktopOnly(
    manifest: PluginManifest | null = getManifest(),
): boolean {
    return (manifest as { isDesktopOnly?: unknown } | null)?.isDesktopOnly === true;
}
