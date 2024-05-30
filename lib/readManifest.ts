import fs from 'node:fs';

export let manifest = null;
try {
    const data = fs.readFileSync("manifest.json", "utf8");
    manifest = JSON.parse(data);
} catch (err) {
    console.error("Failed to load JSON file:", err);
}
