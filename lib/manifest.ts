import fs from "node:fs";
import path from "node:path";
import { PluginManifest } from "../types/manifest.js";

let cachedManifest: PluginManifest | null | undefined;

/**
 * Walks up from `startDir` looking for a file named `manifest.json`
 * that contains an `id` field (Obsidian plugin manifest).
 * Returns the parsed manifest, or null if none is found.
 */
function findManifest(startDir: string): PluginManifest | null {
    let dir = startDir;

    while (true) {
        const candidate = path.join(dir, "manifest.json");

        try {
            const data = fs.readFileSync(candidate, "utf8");
            const parsed = JSON.parse(data);

            // Obsidian plugin manifests always have an `id` field —
            // skip unrelated manifest.json files (e.g. Chrome extensions).
            if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
                return parsed as PluginManifest;
            }
        } catch {
            // File doesn't exist or isn't valid JSON — keep walking.
        }

        const parent = path.dirname(dir);
        if (parent === dir) {
            // Reached filesystem root without finding a manifest.
            return null;
        }
        dir = parent;
    }
}

export function getManifest(): PluginManifest | null {
    if (cachedManifest !== undefined) {
        return cachedManifest;
    }

    cachedManifest = findManifest(process.cwd());
    return cachedManifest;
}
