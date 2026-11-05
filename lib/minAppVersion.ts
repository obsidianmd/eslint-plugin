import { gte, valid } from "semver";
import { getManifest } from "./manifest.js";

/**
 * The options of a rule whose suggestion needs a newer Obsidian API: its
 * `minAppVersion` takes the place of the one in manifest.json.
 */
export type MinAppVersionOptions = [{ minAppVersion?: string }?];

export const minAppVersionSchema = [
    {
        type: "object" as const,
        properties: {
            minAppVersion: {
                type: "string" as const,
                description:
                    "The minimum app version to check against. Defaults to manifest.json minAppVersion.",
            },
        },
        additionalProperties: false,
    },
];

/**
 * A version semver can compare: as written when valid, a bare "x" or "x.y"
 * with the missing parts read as 0 ("0.15" is 0.15.0), else undefined. Nothing
 * looser: semver's coerce would read "x99.0.0" as 99.0.0, and a manifest could
 * then switch a check off with a minAppVersion Obsidian does not read that way.
 */
export function toVersion(raw: string): string | undefined {
    const version = valid(raw);
    if (version) {
        return version;
    }
    const partial = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
    return partial ? `${Number(partial[1])}.${Number(partial[2] ?? 0)}.0` : undefined;
}

/**
 * Whether the plugin's minimum app version, from the rule's `minAppVersion`
 * option or else from manifest.json, is `since` or later: true or false, or
 * undefined when there is no such version or it is not one that can be read.
 *
 * A suggestion whose replacement needs `since` is not offered when this is
 * false, and says which version it needs when this is undefined.
 */
export function supportsVersion(option: string | undefined, since: string): boolean | undefined {
    const raw: unknown = option ?? getManifest()?.minAppVersion;
    if ((typeof raw !== "string" && typeof raw !== "number") || raw === "") {
        return undefined;
    }
    const version = toVersion(String(raw));
    return version === undefined ? undefined : gte(version, since);
}
