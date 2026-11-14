// When the word "command" in a command's name or ID is a redundant label,
// as in "Command: open note" or `open-note-command` of "Open note", rather
// than what the command acts on, as in "Copy URI for command",
// "Create slash command", "Select and copy command ID" or
// `open-command-selector`.

import { removePhrase } from "./nameRemoval.js";
import type { StringEdit } from "./stringEdit.js";
import { idWords, phrasePattern } from "./words.js";

export const COMMAND = phrasePattern("command")!;

// Words that, right before a trailing "command", make it the object of the
// name: "Copy URI for command", "Run the command", "Add custom command".
const LINKING_WORDS = new Set([
    "a", "an", "the", "this", "that", "these", "those", "each", "every", "any", "all", "some",
    "my", "your", "its", "their", "our", "his", "her",
    "about", "as", "at", "by", "for", "from", "in", "into", "of", "on", "onto", "per", "to", "via", "with",
    "and", "or", "nor",
    "another", "current", "custom", "last", "new", "next", "other", "previous", "raw", "selected",
]);

// Verbs that take a command as their object, so that a trailing "command"
// after them is what they act on: "Run shell command", "Copy URI command".
const COMMAND_VERBS = new Set([
    "assign", "bind", "call", "cancel", "choose", "copy", "exec", "execute", "find", "insert",
    "invoke", "paste", "pick", "record", "register", "repeat", "rerun", "run", "search", "select",
    "send", "trigger",
]);

// Nouns that a leading "command" describes, as in "command palette" or
// `command-id-copy`.
const COMMAND_COMPOUNDS = new Set([
    "bar", "group", "groups", "history", "hotkey", "hotkeys", "id", "ids", "key", "keys", "line",
    "list", "menu", "mode", "name", "names", "output", "palette", "picker", "prompt", "result",
    "results", "search", "selector", "set", "sets",
]);

/**
 * Whether a trailing "command" after `before`, the words in front of it, is
 * redundant: at least two words are left, the last is not a linking word and
 * the first is not a verb that takes a command.
 */
function redundantAtEnd(before: readonly string[]): boolean {
    return (
        before.length >= 2 &&
        !LINKING_WORDS.has(before[before.length - 1]) &&
        !COMMAND_VERBS.has(before[0])
    );
}

/**
 * The command name without "command", where "command" in it is a redundant
 * label: at the start or the end with a separator such as `:`, `-` or `|`,
 * or in brackets, as in "Command: open note", "Open note - command" or
 * "[Command] open note". Null where "command" is anything else, such as the
 * object of the name or a word in the middle of it. A last word that only
 * whitespace separates is a word of the name: "Open settings command" reads
 * like "Create slash command" or "Edit shell command", where "command" is
 * what the command acts on, and the words cannot tell them apart.
 */
export function redundantCommandInName(name: string): StringEdit | null {
    return COMMAND.test(name)
        ? removePhrase(name, COMMAND, { prefixAfterSpace: false, suffixAfterSpace: false })
        : null;
}

/**
 * Whether "command" in a command ID is redundant: it is the first or the
 * last word of the ID and nowhere else, at least two other words are left,
 * and it does not describe the next word (`command-palette`) or end a name
 * whose words make it the object (`copy-uri-command`, `run-shell-command`).
 * A last "command" is redundant only where the command's name, which
 * `nameWithoutCommand` says, does not have the word: `create-slash-command`
 * of "Create slash command" names a slash command, and with no name to read,
 * the words of the ID alone cannot tell.
 */
export function isRedundantCommandInId(id: string, nameWithoutCommand: boolean): boolean {
    const words = idWords(id);
    const others = words.filter((word) => word !== "command");
    if (others.length < 2 || others.length === words.length) {
        return false;
    }
    let start = 0;
    while (words[start] === "command") {
        start++;
    }
    let end = words.length;
    while (words[end - 1] === "command") {
        end--;
    }
    const middle = words.slice(start, end);
    if (middle.includes("command")) {
        return false;
    }
    const leading = start > 0 && !COMMAND_COMPOUNDS.has(middle[0]);
    const trailing = end < words.length && nameWithoutCommand && redundantAtEnd(middle);
    return (start === 0 || leading) && (end === words.length || trailing);
}
