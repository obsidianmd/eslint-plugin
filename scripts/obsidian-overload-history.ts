// Regenerates lib/rules/obsidianOverloadHistory.ts and
// lib/rules/obsidianDeclarationHistory.ts from every obsidian typings package
// published on npm. A development tool: it is not part of the published
// plugin.
//
//     npx tsx scripts/obsidian-overload-history.ts [--cache <dir>] [--report]
//
// --cache  where the downloaded packages are kept between runs (default: a
//          directory in the system temp directory)
// --report also print every overload of every overloaded member, with its
//          @since and the first published typings that have it
//
// The @since of some overloads names the release that changed the signature,
// not the one that added the call: `Workspace.on('editor-change', …)` is in
// the 0.12.17 typings, with `markdownView: MarkdownView`, and its @since 1.1.1
// marks the widening to `info: MarkdownView | MarkdownFileInfo`. A callback
// written for the new signature still runs on older versions, so for each such
// overload the table records the first published typings that have it, and
// no-unsupported-api requires the lower of the two.
//
// The same holds for whole members, most often ones with a single signature:
// `ButtonComponent.setDisabled(disabled: boolean): this` is in the 0.11.13
// typings, written as it is today, and its @since is 1.2.3. So for each
// declaration whose name the typings had before its @since, the second table
// records each shape it had (see obsidianDeclarations.ts) and the typings that
// have that shape, and the rule finds the oldest typings from which on every
// release has a shape the use fits.
//
// A typings release describes the app release of the same version, and is
// published with or after it. So the first typings that declare a member are
// an upper bound of the first app that had it: the app can have had it
// earlier, undeclared, or in a release with no typings on npm (there are none
// before 0.11.13), and the rule then asks for a later version than needed,
// never an earlier one.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";
import { compare, lt, prerelease, valid } from "semver";
import ts from "typescript";
import {
    collectDeclarationShapes,
    indexTypeDeclarations,
    parseShape,
    referencedTypeNames,
    typeHashes,
} from "../lib/rules/obsidianDeclarations.js";
import { getOverloadKey, getSinceTag } from "../lib/rules/obsidianOverloads.js";

export interface Typings {
    version: string;
    text: string;
}

export interface OverloadRow {
    member: string;
    key: string;
    since: string | undefined;
    firstPublished: string | undefined;
}

// Each method of each class and interface, and each function, by qualified
// name, with the key and @since of every declaration.
function collectOverloads(text: string): Map<string, { key: string; since: string | undefined }[]> {
    const sourceFile = ts.createSourceFile("obsidian.d.ts", text, ts.ScriptTarget.Latest, true);
    const members = new Map<string, { key: string; since: string | undefined }[]>();
    const add = (name: string, declaration: ts.SignatureDeclaration) => {
        const list = members.get(name) ?? [];
        list.push({ key: getOverloadKey(declaration), since: getSinceTag(declaration) });
        members.set(name, list);
    };
    const visit = (node: ts.Node): void => {
        if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name) {
            for (const member of node.members) {
                if ((ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) && member.name) {
                    add(`${node.name.text}.${member.name.getText(sourceFile)}`, member);
                }
            }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            add(node.name.text, node);
        } else if (ts.isSourceFile(node) || ts.isModuleDeclaration(node) || ts.isModuleBlock(node)) {
            ts.forEachChild(node, visit);
        }
    };
    visit(sourceFile);
    return members;
}

// Every overload of every member the last (latest) typings declare more than
// once, with the first of the typings, in the order given, that has an overload
// of the same member with the same key.
export function buildOverloadHistory(typings: Typings[]): OverloadRow[] {
    const parsed = typings.map(({ version, text }) => ({ version, members: collectOverloads(text) }));
    const latest = parsed[parsed.length - 1];
    const rows: OverloadRow[] = [];
    for (const [member, overloads] of latest.members) {
        if (overloads.length < 2) {
            continue;
        }
        for (const { key, since } of overloads) {
            const first = parsed.find((entry) => entry.members.get(member)?.some((overload) => overload.key === key));
            rows.push({ member, key, since, firstPublished: first?.version });
        }
    }
    return rows;
}

// The rows the rule needs: an overload published before the version its
// @since names.
export function historyEntries(rows: OverloadRow[]): [string, { since: string; firstPublished: string }][] {
    return rows.flatMap(({ member, key, since, firstPublished }) =>
        since && firstPublished && valid(since) && lt(firstPublished, since)
            ? [[`${member}${key}`, { since, firstPublished }] as [string, { since: string; firstPublished: string }]]
            : [],
    );
}

export function renderHistoryModule(source: string, versions: string[], rows: OverloadRow[]): string {
    const entries = historyEntries(rows)
        .map(([key, { since, firstPublished }]) =>
            `    ${JSON.stringify(key)}: { since: ${JSON.stringify(since)}, firstPublished: ${JSON.stringify(firstPublished)} },`,
        )
        .join("\n");
    return `// Generated by scripts/obsidian-overload-history.ts from the obsidian typings
// published on npm, ${versions[0]} to ${source} (${versions.length} versions). Do not edit:
// regenerate with \`npx tsx scripts/obsidian-overload-history.ts\`.
//
// The overloads of an Obsidian method, in the ${source} typings, that were published
// before the version their @since names, as \`Class.member\` and the overload's key
// (see getOverloadKey), with the first published typings that have them.
// no-unsupported-api requires the lower of the two versions.

export const OVERLOAD_HISTORY_SOURCE = ${JSON.stringify(source)};

export const OVERLOAD_HISTORY: Readonly<Record<string, { since: string; firstPublished: string }>> = {
${entries}
};
`;
}

// The versions that have each value, as index ranges into the version list:
// "0-5,7-48".
function rangesOf(present: boolean[]): string {
    const ranges: string[] = [];
    for (let start = 0; start < present.length; start++) {
        if (!present[start]) {
            continue;
        }
        let end = start;
        while (end + 1 < present.length && present[end + 1]) {
            end++;
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end;
    }
    return ranges.join(",");
}

export interface DeclarationHistory {
    versions: string[];
    // Each declaration the typings had before the version its @since names in
    // the latest typings, with each shape it had and the versions that had it.
    declarations: [string, [string, string][]][];
    // Each interface, type alias and enum those shapes refer to, with the hash
    // of its meaning in each version that declares it.
    types: [string, [string, string][]][];
    // The declarations of the latest typings without any @since that the
    // oldest typings did not have, except members of the obsidian module's own
    // interfaces; their shapes are in `declarations` too.
    undated: string[];
}

export function buildDeclarationHistory(typings: Typings[]): DeclarationHistory {
    const parsed = typings.map(({ version, text }) => {
        const sourceFile = ts.createSourceFile("obsidian.d.ts", text, ts.ScriptTarget.Latest, true);
        const index = indexTypeDeclarations(sourceFile);
        return { version, shapes: collectDeclarationShapes(sourceFile), index, hash: typeHashes(index) };
    });
    const versions = parsed.map(({ version }) => version);
    const latest = parsed[parsed.length - 1];
    const declarations: [string, [string, string][]][] = [];
    const undated: string[] = [];
    const referenced = new Set<string>();
    for (const [name, latestShapes] of latest.shapes) {
        let since: string | undefined;
        for (const { since: raw } of latestShapes) {
            const version = raw === undefined ? null : valid(raw);
            if (version && (!since || lt(since, version))) {
                since = version;
            }
        }
        const first = parsed.find((entry) => entry.shapes.has(name));
        const isUndated = latestShapes.every(({ since: raw }) => raw === undefined || !valid(raw));
        // A member of an interface of the obsidian module, such as
        // RequestUrlParam.url or CachedMetadata.sections, describes data the
        // plugin or the app supplies, not an API: only dated ones count.
        const owner = name.includes(".") ? name.slice(0, name.indexOf(".")) : undefined;
        if (isUndated && owner !== undefined && latest.index.has(owner)) {
            continue;
        }
        if (isUndated && first && first !== parsed[0]) {
            undated.push(name);
        } else if (!since || !first || !lt(first.version, since)) {
            continue;
        }
        const shapes = new Map<string, boolean[]>();
        parsed.forEach((entry, i) => {
            for (const { shape } of entry.shapes.get(name) ?? []) {
                const present = shapes.get(shape) ?? versions.map(() => false);
                present[i] = true;
                shapes.set(shape, present);
            }
        });
        declarations.push([name, [...shapes].map(([shape, present]) => [rangesOf(present), shape])]);
        for (const shape of shapes.keys()) {
            const node = parseShape(shape);
            for (const type of node ? referencedTypeNames(node) : []) {
                referenced.add(type);
            }
        }
    }
    const types: [string, [string, string][]][] = [];
    for (const name of [...referenced].sort()) {
        const hashes = new Map<string, boolean[]>();
        parsed.forEach((entry, i) => {
            const hash = entry.hash(name);
            if (hash !== undefined) {
                const present = hashes.get(hash) ?? versions.map(() => false);
                present[i] = true;
                hashes.set(hash, present);
            }
        });
        if (hashes.size > 0) {
            types.push([name, [...hashes].map(([hash, present]) => [rangesOf(present), hash])]);
        }
    }
    return { versions, declarations, types, undated };
}

export function renderDeclarationHistoryModule(history: DeclarationHistory): string {
    const { versions } = history;
    const rows = (entries: [string, [string, string][]][]) =>
        entries.map(([name, values]) => `    ${JSON.stringify(name)}: ${JSON.stringify(values)},`).join("\n");
    return `// Generated by scripts/obsidian-overload-history.ts from the obsidian typings
// published on npm, ${versions[0]} to ${versions[versions.length - 1]} (${versions.length} versions). Do not edit:
// regenerate with \`npx tsx scripts/obsidian-overload-history.ts\`.
//
// The declarations of the ${versions[versions.length - 1]} typings that earlier typings had before the
// version their @since names, by qualified name, with each shape the declaration
// had (see obsidianDeclarations.ts) and the versions that have it, as index
// ranges into DECLARATION_HISTORY_VERSIONS. TYPE_HISTORY has the hash of each
// interface, type alias and enum those shapes refer to, by version, so the rule
// can tell that a name meant the same then as in the plugin's typings.
// UNDATED_DECLARATIONS are the declarations of the ${versions[versions.length - 1]} typings without any @since
// that the oldest typings did not have; DECLARATION_HISTORY has their shapes too.

export const DECLARATION_HISTORY_VERSIONS: readonly string[] = ${JSON.stringify(versions)};

export const DECLARATION_HISTORY: Readonly<Record<string, readonly (readonly [versions: string, shape: string])[]>> = {
${rows(history.declarations)}
};

export const TYPE_HISTORY: Readonly<Record<string, readonly (readonly [versions: string, hash: string])[]>> = {
${rows(history.types)}
};

export const UNDATED_DECLARATIONS: readonly string[] = [
${history.undated.map((name) => `    ${JSON.stringify(name)},`).join("\n")}
];
`;
}

// One file of an npm package tarball.
function readFromTarball(tarball: Buffer, wanted: string): string | undefined {
    const tar = zlib.gunzipSync(tarball);
    const field = (block: Buffer, start: number, length: number) =>
        block.toString("utf8", start, start + length).replace(/\0[\s\S]*$/, "");
    for (let offset = 0; offset + 512 <= tar.length; ) {
        const header = tar.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) {
            break;
        }
        const name = [field(header, 345, 155), field(header, 0, 100)].filter(Boolean).join("/");
        const size = parseInt(field(header, 124, 12).trim() || "0", 8);
        offset += 512;
        if (name === wanted) {
            return tar.toString("utf8", offset, offset + size);
        }
        offset += Math.ceil(size / 512) * 512;
    }
    return undefined;
}

function npm(args: string[], cwd?: string): string {
    return execFileSync("npm", args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
}

// Every published release's obsidian.d.ts, oldest first. Prereleases are left
// out (1.5.7-1 and 1.10.2-1 republish 1.5.7 and 1.10.2), and so are the 2015
// packages 0.0.1 to 0.0.4, which predate Obsidian and have no typings.
function downloadTypings(cache: string): Typings[] {
    fs.mkdirSync(cache, { recursive: true });
    const versions = (JSON.parse(npm(["view", "obsidian", "versions", "--json"])) as string[])
        .filter((version) => valid(version) && !prerelease(version))
        .sort(compare);
    const tarball = (version: string) => path.join(cache, `obsidian-${version}.tgz`);
    const missing = versions.filter((version) => !fs.existsSync(tarball(version)));
    for (let i = 0; i < missing.length; i += 10) {
        npm(["pack", ...missing.slice(i, i + 10).map((version) => `obsidian@${version}`), "--pack-destination", cache, "--silent"]);
    }
    return versions.flatMap((version) => {
        const text = readFromTarball(fs.readFileSync(tarball(version)), "package/obsidian.d.ts");
        return text === undefined ? [] : [{ version, text }];
    });
}

function main(): void {
    const args = process.argv.slice(2);
    const cacheIndex = args.indexOf("--cache");
    const cache = cacheIndex >= 0 ? path.resolve(args[cacheIndex + 1]) : path.join(os.tmpdir(), "obsidian-typings");
    const typings = downloadTypings(cache);
    const versions = typings.map(({ version }) => version);
    const source = versions[versions.length - 1];
    const rows = buildOverloadHistory(typings);
    const out = fileURLToPath(new URL("../lib/rules/obsidianOverloadHistory.ts", import.meta.url));
    fs.writeFileSync(out, renderHistoryModule(source, versions, rows));
    console.log(`Wrote ${path.relative(process.cwd(), out)}: ${historyEntries(rows).length} entries from ${versions.length} versions (${versions[0]} to ${source}).`);
    const declarations = buildDeclarationHistory(typings);
    const declarationsOut = fileURLToPath(new URL("../lib/rules/obsidianDeclarationHistory.ts", import.meta.url));
    fs.writeFileSync(declarationsOut, renderDeclarationHistoryModule(declarations));
    console.log(`Wrote ${path.relative(process.cwd(), declarationsOut)}: ${declarations.declarations.length} declarations (${declarations.undated.length} without @since), ${declarations.types.length} types.`);
    if (args.includes("--report")) {
        console.log("\n| Member | Overload | @since | First published | Required |");
        console.log("| :-- | :-- | :-- | :-- | :-- |");
        for (const { member, key, since, firstPublished } of rows) {
            const required = since && firstPublished && valid(since) && lt(firstPublished, since) ? firstPublished : since;
            // Backslashes first, so the one put before a | is not escaped again.
            const cell = key.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
            console.log(`| ${member} | \`${cell}\` | ${since ?? "none"} | ${firstPublished ?? "not found"} | ${required ?? "none"} |`);
        }
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main();
}
