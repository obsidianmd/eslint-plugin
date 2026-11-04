import assert from "node:assert";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { lt, valid } from "semver";
import { OVERLOAD_HISTORY, OVERLOAD_HISTORY_SOURCE } from "../lib/rules/obsidianOverloadHistory.js";
import { buildOverloadHistory, historyEntries, renderHistoryModule } from "../scripts/obsidian-overload-history.js";

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
