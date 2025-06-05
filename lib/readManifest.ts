import fs from "node:fs";
import { PluginManifest } from "../types/manifest.js";

export let manifest: PluginManifest;
try {
	const data = fs.readFileSync("manifest.json", "utf8");
	manifest = JSON.parse(data);
} catch (err) {
	console.error("Failed to load JSON file:", err);
}
