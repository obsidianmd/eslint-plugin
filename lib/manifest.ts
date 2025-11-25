import fs from "node:fs";
import { PluginManifest } from "../types/manifest.js";

let cachedManifest: PluginManifest | null | undefined;

export function getManifest(): PluginManifest | null {
	if (cachedManifest !== undefined) {
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
