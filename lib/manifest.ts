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
