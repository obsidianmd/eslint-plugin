import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN_PACKAGE_NAME = "eslint-plugin-obsidianmd";

export interface PluginPackageJson {
    name: string;
    version: string;
}

/**
 * This plugin's own package.json, found from the `import.meta.url` of one of
 * its modules, or undefined when there is none.
 *
 * A module sits one or more directories below the package root: lib/ or
 * lib/rules/ in the source, dist/lib/ or dist/lib/rules/ in the build. Each
 * directory from the module's up is tried, nearest first, and the first
 * package.json named eslint-plugin-obsidianmd is the one. The name is what
 * tells them apart: a fixed number of `..` fits one layout only, and in the
 * other it reaches the directory above the checkout, which may have a
 * package.json of its own.
 */
export function readPluginPackageJson(moduleUrl: string): PluginPackageJson | undefined {
    let dir = path.dirname(fileURLToPath(moduleUrl));
    for (;;) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as Partial<PluginPackageJson> | null;
            if (pkg?.name === PLUGIN_PACKAGE_NAME && typeof pkg.version === "string") {
                return { name: pkg.name, version: pkg.version };
            }
        } catch {
            // None here, or not JSON: try the next directory up.
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return undefined;
        }
        dir = parent;
    }
}
