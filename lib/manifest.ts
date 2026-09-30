import fs from "node:fs";
import { PluginManifest } from "../types/manifest.js";

let cachedManifest: PluginManifest | null | undefined;

export function getManifest(): PluginManifest | null {
    if (cachedManifest === undefined) {
        cachedManifest = loadManifest("manifest.json");
    }
    return cachedManifest;
}

export function loadManifest(path: string): PluginManifest | null {
    try {
        return JSON.parse(fs.readFileSync(path, "utf8")) as PluginManifest;
    } catch (err) {
        // A library, a tooling repo or a standalone CLI legitimately has no
        // manifest, so ENOENT is not an error and must not print anything. A
        // manifest that exists but cannot be read or parsed is a real defect.
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Failed to load JSON file:", err);
        }
        return null;
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
