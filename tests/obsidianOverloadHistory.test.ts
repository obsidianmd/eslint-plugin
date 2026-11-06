import assert from "node:assert";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { lt, valid } from "semver";
import ts from "typescript";
import {
    DECLARATION_HISTORY,
    DECLARATION_HISTORY_VERSIONS,
    TYPE_HISTORY,
    UNDATED_DECLARATIONS,
} from "../lib/rules/obsidianDeclarationHistory.js";
import { collectDeclarationShapes, indexTypeDeclarations, typeHashes } from "../lib/rules/obsidianDeclarations.js";
import { OVERLOAD_HISTORY, OVERLOAD_HISTORY_SOURCE } from "../lib/rules/obsidianOverloadHistory.js";
import {
    buildDeclarationHistory,
    buildOverloadHistory,
    historyEntries,
    renderDeclarationHistoryModule,
    renderHistoryModule,
} from "../scripts/obsidian-overload-history.js";

const requireHere = createRequire(import.meta.url);
const obsidianDir = path.dirname(requireHere.resolve("obsidian/package.json"));
const installed = {
    version: (JSON.parse(fs.readFileSync(path.join(obsidianDir, "package.json"), "utf8")) as { version: string }).version,
    text: fs.readFileSync(path.join(obsidianDir, "obsidian.d.ts"), "utf8"),
};

// The published typings it was built from are downloaded by the generator, not
// here; what can be checked offline is that it matches the typings installed.
describe("the generated obsidianOverloadHistory.ts", () => {
    it("was generated from the obsidian typings the tests use", () => {
        // After raising the obsidian devDependency, regenerate it with
        // `npx tsx scripts/obsidian-overload-history.ts`.
        assert.strictEqual(OVERLOAD_HISTORY_SOURCE, installed.version);
    });

    it("lists overloads of those typings, each with its @since there and an older first version", () => {
        const sinceByKey = new Map(buildOverloadHistory([installed]).map((row) => [`${row.member}${row.key}`, row.since]));
        const problems = Object.entries(OVERLOAD_HISTORY).filter(
            ([key, { since, firstPublished }]) =>
                sinceByKey.get(key) !== since || !valid(firstPublished) || !lt(firstPublished, since),
        );
        assert.deepStrictEqual(problems.map(([key]) => key), []);
        assert.ok(Object.keys(OVERLOAD_HISTORY).length > 0);
    });
});

describe("scripts/obsidian-overload-history.ts", () => {
    const workspace = (version: string, members: string) => ({ version, text: `export class Workspace {\n${members}\n}\n` });
    const older = workspace("0.12.0", `
        on(name: 'editor-change', callback: (editor: Editor, view: MarkdownView) => any): EventRef;
        on(name: 'quit', callback: () => any): EventRef;
        duplicateLeaf(leaf: WorkspaceLeaf, direction?: SplitDirection): Promise<void>;
        setActiveLeaf(leaf: WorkspaceLeaf, pushHistory?: boolean, focus?: boolean): void;
    `);
    const latest = workspace("1.2.0", `
        /** @since 1.1.1 */
        on(name: "editor-change", callback: (editor: Editor, info: MarkdownView | MarkdownFileInfo) => any, ctx?: any): EventRef;
        /** @since 0.10.2 */
        on(name: 'quit', callback: () => any): EventRef;
        /** @since 1.2.0 */
        on(name: 'brand-new', callback: () => any): EventRef;
        /** @since 0.13.8 */
        duplicateLeaf(
            leaf: WorkspaceLeaf, // the leaf
            dir?: /* where */ SplitDirection,
        ): Promise<WorkspaceLeaf>;
        /** @since 1.1.0 */
        duplicateLeaf(leaf: WorkspaceLeaf, leafType: PaneType | boolean): Promise<WorkspaceLeaf>;
        /** @since 0.16.3 */
        setActiveLeaf(leaf: WorkspaceLeaf, params?: { focus?: boolean }): void;
        setActiveLeaf(leaf: WorkspaceLeaf, pushHistory: boolean, focus: boolean): void;
        /** @since 1.0.0 */
        single(): void;
    `);
    const rows = buildOverloadHistory([older, latest]);

    it("finds each overload of the latest typings' overloaded members in the first typings that have it", () => {
        assert.deepStrictEqual(rows, [
            // An event by its name, whatever its callback was then.
            { member: "Workspace.on", key: '(0: "editor-change")', since: "1.1.1", firstPublished: "0.12.0" },
            { member: "Workspace.on", key: '(0: "quit")', since: "0.10.2", firstPublished: "0.12.0" },
            { member: "Workspace.on", key: '(0: "brand-new")', since: "1.2.0", firstPublished: "1.2.0" },
            // Any other by its parameter types, whatever their names, spacing,
            // comments and the return type.
            { member: "Workspace.duplicateLeaf", key: "(WorkspaceLeaf, SplitDirection?)", since: "0.13.8", firstPublished: "0.12.0" },
            { member: "Workspace.duplicateLeaf", key: "(WorkspaceLeaf, PaneType|boolean)", since: "1.1.0", firstPublished: "1.2.0" },
            // An optional parameter is another overload than a required one.
            { member: "Workspace.setActiveLeaf", key: "(WorkspaceLeaf, {focus?:boolean}?)", since: "0.16.3", firstPublished: "1.2.0" },
            { member: "Workspace.setActiveLeaf", key: "(WorkspaceLeaf, boolean, boolean)", since: undefined, firstPublished: "1.2.0" },
        ]);
    });

    it("keeps only the overloads published before their @since, in a module the rule reads", () => {
        assert.deepStrictEqual(historyEntries(rows), [
            ['Workspace.on(0: "editor-change")', { since: "1.1.1", firstPublished: "0.12.0" }],
            ["Workspace.duplicateLeaf(WorkspaceLeaf, SplitDirection?)", { since: "0.13.8", firstPublished: "0.12.0" }],
        ]);
        const module = renderHistoryModule("1.2.0", ["0.12.0", "1.2.0"], rows);
        assert.ok(module.startsWith("// Generated by scripts/obsidian-overload-history.ts"));
        assert.ok(module.includes('export const OVERLOAD_HISTORY_SOURCE = "1.2.0";'));
        assert.ok(module.includes('    "Workspace.on(0: \\"editor-change\\")": { since: "1.1.1", firstPublished: "0.12.0" },'));
    });

    it("writes the checked-in module's shape", () => {
        const checkedIn = fs.readFileSync(new URL("../lib/rules/obsidianOverloadHistory.ts", import.meta.url), "utf8");
        const rendered = renderHistoryModule(
            OVERLOAD_HISTORY_SOURCE,
            [],
            Object.entries(OVERLOAD_HISTORY).map(([key, { since, firstPublished }]) => {
                const open = key.indexOf("(");
                return { member: key.slice(0, open), key: key.slice(open), since, firstPublished };
            }),
        );
        // Everything after the header, which names the versions downloaded.
        const body = (text: string) => text.slice(text.indexOf("\nexport const"));
        assert.strictEqual(body(checkedIn), body(rendered));
    });
});

describe("the generated obsidianDeclarationHistory.ts", () => {
    const sourceFile = ts.createSourceFile("obsidian.d.ts", installed.text, ts.ScriptTarget.Latest, true);
    const last = DECLARATION_HISTORY_VERSIONS.length - 1;
    const present = (ranges: string, index: number) =>
        ranges.split(",").some((range) => {
            const [start, end = start] = range.split("-").map(Number);
            return start <= index && index <= end;
        });

    it("was generated from the obsidian typings the tests use", () => {
        assert.strictEqual(DECLARATION_HISTORY_VERSIONS[last], installed.version);
    });

    it("has, for the last version, the shapes and type hashes of those typings", () => {
        const shapes = collectDeclarationShapes(sourceFile);
        const problems = Object.entries(DECLARATION_HISTORY).filter(([name, entries]) => {
            const listed = entries.filter(([ranges]) => present(ranges, last)).map(([, shape]) => shape);
            return JSON.stringify([...new Set(listed)].sort()) !== JSON.stringify([...new Set((shapes.get(name) ?? []).map(({ shape }) => shape))].sort());
        });
        assert.deepStrictEqual(problems.map(([name]) => name), []);
        const hash = typeHashes(indexTypeDeclarations(sourceFile));
        const wrong = Object.entries(TYPE_HISTORY).filter(
            ([name, entries]) => entries.find(([ranges]) => present(ranges, last))?.[1] !== hash(name),
        );
        assert.deepStrictEqual(wrong.map(([name]) => name), []);
        assert.ok(Object.keys(DECLARATION_HISTORY).length > 0);
    });

    it("writes the checked-in module's shape", () => {
        const checkedIn = fs.readFileSync(new URL("../lib/rules/obsidianDeclarationHistory.ts", import.meta.url), "utf8");
        const rendered = renderDeclarationHistoryModule({
            versions: [...DECLARATION_HISTORY_VERSIONS],
            declarations: Object.entries(DECLARATION_HISTORY).map(([name, entries]) => [name, entries.map(([a, b]) => [a, b])]),
            types: Object.entries(TYPE_HISTORY).map(([name, entries]) => [name, entries.map(([a, b]) => [a, b])]),
            undated: [...UNDATED_DECLARATIONS],
        });
        assert.strictEqual(checkedIn, rendered);
    });
});

describe("scripts/obsidian-overload-history.ts declaration history", () => {
    const typings = (version: string, body: string) => ({ version, text: body });
    const history = buildDeclarationHistory([
        typings("0.12.0", `
            export type PaneType = 'tab' | 'split';
            export class Workspace {
                getLeaf(newLeaf?: boolean): WorkspaceLeaf;
                revealLeaf(leaf: WorkspaceLeaf): void;
                same(): void;
            }
        `),
        typings("0.13.0", `
            type PaneType = 'tab' | 'split';
            export class Workspace {
                getLeaf(newLeaf?: PaneType | boolean): WorkspaceLeaf;
                revealLeaf(leaf: WorkspaceLeaf): void;
                same(): void;
            }
        `),
        typings("1.0.0", `
            /** A pane. */
            export type PaneType = 'tab' | 'split' | 'window';
            export class Workspace {
                /** @since 0.16.0 */
                getLeaf(
                    newLeaf?: PaneType | boolean, // the kind
                ): WorkspaceLeaf;
                /** @since 1.0.0 */
                revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
                /** @since 0.12.0 */
                same(): void;
                /** @since 1.0.0 */
                added(): void;
            }
        `),
    ]);

    it("lists each shape of a member older typings had before its @since, by version", () => {
        assert.deepStrictEqual(history.versions, ["0.12.0", "0.13.0", "1.0.0"]);
        // `same` is no older than its @since, and `added` is new.
        assert.deepStrictEqual(history.declarations, [
            ["Workspace.getLeaf", [["0", "(_0?:boolean)=>WorkspaceLeaf"], ["1-2", "(_0?:PaneType|boolean)=>WorkspaceLeaf"]]],
            ["Workspace.revealLeaf", [["0-1", "(_0:WorkspaceLeaf)=>void"], ["2", "(_0:WorkspaceLeaf)=>Promise<void>"]]],
        ]);
    });

    it("hashes each type the shapes name, ignoring export, comments and layout", () => {
        assert.strictEqual(history.types.length, 1);
        const [name, hashes] = history.types[0];
        assert.strictEqual(name, "PaneType");
        // 0.12.0 and 0.13.0 mean the same; 1.0.0 added 'window'.
        assert.deepStrictEqual(hashes.map(([ranges]) => ranges), ["0-1", "2"]);
    });
});

describe("scripts/obsidian-overload-history.ts declarations without @since", () => {
    const history = buildDeclarationHistory([
        {
            version: "0.12.0",
            text: `
                export const moment_2: unknown;
                export { moment_2 as moment }
                export class Workspace { old(): void; }
                export interface Options { a?: string; }
                export class View { navigation: boolean; }
                export class FileView extends View {}
            `,
        },
        {
            version: "1.0.0",
            text: `
                declare global {
                    interface HTMLElement { setCssProps(props: Record<string, string>): void; }
                    var activeDocument: Document;
                }
                export const moment: unknown;
                export class Workspace { old(): void; fresh(): void; field: number; }
                export interface Options { a?: string; b?: string; }
                export class View { navigation: boolean; }
                export class FileView extends View { navigation: boolean; }
            `,
        },
    ]);

    it("lists those the oldest typings did not have, by their exported name, but not data interfaces, inherited members or later fields", () => {
        assert.deepStrictEqual(history.undated, ["HTMLElement.setCssProps", "activeDocument", "Workspace.fresh"]);
        assert.deepStrictEqual(
            history.declarations.map(([name, shapes]) => [name, shapes.map(([ranges]) => ranges)]),
            [["HTMLElement.setCssProps", ["1"]], ["activeDocument", ["1"]], ["Workspace.fresh", ["1"]]],
        );
    });
});
