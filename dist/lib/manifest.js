import fs from "node:fs";
let cachedManifest;
export function getManifest() {
    if (cachedManifest !== undefined) {
        return cachedManifest;
    }
    try {
        const data = fs.readFileSync("manifest.json", "utf8");
        cachedManifest = JSON.parse(data);
        return cachedManifest;
    }
    catch (err) {
        console.error("Failed to load JSON file:", err);
        cachedManifest = null;
        return cachedManifest;
    }
}
