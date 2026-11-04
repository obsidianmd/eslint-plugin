// What the suggestions of the ID rules remove from a command ID: the words the
// rule reports, and the separator that goes with them.

import { StringEdit } from "./stringEdit.js";
import { idWords, idWordSpans, indexOfWords } from "./words.js";

// What may separate the words of an ID where a suggestion removes some
const ID_SEPARATORS_ONLY = /^[-_:./ ]*$/u;
const ID_SEPARATORS_AT_START = /^[-_:./ ]+/u;
const ID_SEPARATOR = /^[-_:./ ]$/u;
const WORD_CHAR = /^[\p{L}\p{N}\p{M}]$/u;

/**
 * Removes `wanted`, the words of a plugin ID or "command", from a command ID,
 * every time they are there, with a separator next to them: the one after
 * them, or the one before them at the end of the ID. A camelCase ID stays
 * camelCase, so `myPluginOpen` becomes `open`. Null where the words are next
 * to something other than a separator or another word, or nothing would be
 * left.
 */
export function removeIdWords(id: string, wanted: readonly string[]): StringEdit | null {
    const edit = new StringEdit(id);
    for (;;) {
        const text = edit.text;
        const spans = idWordSpans(text);
        const at = indexOfWords(spans.map((span) => span.word), wanted);
        if (at < 0) {
            break;
        }
        const start = spans[at].start;
        const end = spans[at + wanted.length - 1].end;
        const before = text.slice(0, start);
        const after = text.slice(end);
        const charBefore = before.slice(-1);
        const charAfter = after.slice(0, 1);
        if (
            (charBefore !== "" && !ID_SEPARATOR.test(charBefore) && !WORD_CHAR.test(charBefore)) ||
            (charAfter !== "" && !ID_SEPARATOR.test(charAfter) && !WORD_CHAR.test(charAfter))
        ) {
            return null;
        }
        const separatorAfter = ID_SEPARATORS_AT_START.exec(after)?.[0].length ?? 0;
        let removeStart = start;
        let removeEnd = end + separatorAfter;
        if (ID_SEPARATORS_ONLY.test(before)) {
            removeStart = 0;
        } else if (ID_SEPARATORS_ONLY.test(after)) {
            removeStart = start;
            while (removeStart > 0 && ID_SEPARATOR.test(text[removeStart - 1])) {
                removeStart--;
            }
            removeEnd = text.length;
        }
        // "myPluginOpen" and "open-myPluginNote": the words began a camelCase
        // run, which the next word now begins, so it starts in lower case
        const lowerNext = separatorAfter === 0 &&
            (charBefore === "" || ID_SEPARATOR.test(charBefore)) &&
            /^\p{Ll}/u.test(text.slice(start)) &&
            /^\p{Lu}\p{Ll}/u.test(after);
        edit.remove(removeStart, removeEnd);
        if (lowerNext) {
            edit.recase(removeStart, (char) => char.toLowerCase());
        }
    }
    return idWords(edit.text).length > 0 ? edit : null;
}
