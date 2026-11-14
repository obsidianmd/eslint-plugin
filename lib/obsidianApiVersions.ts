import { gt } from "semver";

// The Obsidian version each API a rule's fix or suggestion writes needs: its
// @since, or, earlier or without one, the first typings in the obsidian-api
// history that declare it (obsidianDeclarationHistory.ts). Below it a rule
// offers no rewrite to that API. tests/obsidianApiVersions.test.ts checks each
// against the generated history and the obsidian typings.
export const API_SINCE = {
    // createEl() and createEl(tag, info) are in the first typings, 0.9.7.
    createDiv: "0.10.0",
    createSpan: "0.10.0",
    createFragment: "0.9.11",
    createSvg: "1.1.0",
    activeWindow: "0.15.0",
    activeDocument: "0.15.0",
    "Node.win": "0.15.3",
    "Node.instanceOf": "0.15.3",
    "UIEvent.targetNode": "0.15.3",
    AbstractInputSuggest: "1.4.10",
    "FileManager.trashFile": "1.6.6",
    getLanguage: "1.8.7",
} as const;

export type ApiName = keyof typeof API_SINCE;

/** The later of two versions; undefined counts as the oldest. */
export function laterVersion(a: string | undefined, b: string | undefined): string | undefined {
    if (a === undefined) {
        return b;
    }
    return b !== undefined && gt(b, a) ? b : a;
}
