// The quadratic removePhrase() of 0.5, kept as the reference that the linear
// one in lib/rules/commands/nameRemoval.ts must agree with.

import { sentenceCaseSuggestion } from "../../lib/rules/ui/sentenceCaseUtil.js";
import { StringEdit } from "../../lib/rules/commands/stringEdit.js";

// What separates a label from the rest of a command name, as in
// "Word Tally: Count words" or "Count words - Word Tally". A hyphen needs
// whitespace on both sides, since "Git-based" is one word. It reads the same
// backwards, so the separator at the end of a text is the one at the start of
// the text reversed, which an anchored pattern finds in linear time.
const LABEL_SEPARATOR = /^(?:\s*[:|/>»›→<«‹←·•–—]\s*|\s+-+\s+)/u;
// What a name may not start or end with once a label is gone
const BAD_START = /^[\s\-–—:|/>»›→<«‹←·•,.;!?)\]}]/u;
const BAD_END = /[\s\-–—:|/>»›→<«‹←·•,([{]$/u;
const CLOSING_BRACKET: Readonly<Partial<Record<string, string>>> = { "(": ")", "[": "]" };
// Whitespace alone separates a label only from a word, as in "Git commit"
const WORD_START = /^[\p{L}\p{N}"'“‘]/u;
const WORD_END = /[\p{L}\p{N}\p{M}"'”’)\]]$/u;

export interface PhraseRemovalOptions {
    /**
     * Whether the phrase may be removed from the start of a name that only
     * whitespace separates it from, as the plugin name of "Git commit" may.
     */
    prefixAfterSpace: boolean;
    /**
     * Whether the phrase may be removed from the end of a name that only
     * whitespace separates it from, as "command" in "Run command" may.
     */
    suffixAfterSpace: boolean;
}

/**
 * Removes the phrase that `pattern` finds, every time it is there, from a
 * command name: as a label at the start, with the separator after it, or at
 * the end, with the separator before it, or in brackets at either end. Where
 * a label at the start goes and it began with a capital, the name that is
 * left begins with one too. Null where the phrase is anywhere else, such as
 * in "Commit with Git", or nothing would be left.
 */
export function removePhrase(name: string, pattern: RegExp, options: PhraseRemovalOptions): StringEdit | null {
    const edit = new StringEdit(name);
    let capitalize = false;
    for (;;) {
        const text = edit.text;
        const match = pattern.exec(text);
        if (!match) {
            break;
        }
        const start = match.index;
        const end = start + match[0].length;
        let before = text.slice(0, start);
        let after = text.slice(end);
        let bracketed = false;
        const closing = CLOSING_BRACKET[before.slice(-1)];
        if (closing !== undefined && after.startsWith(closing)) {
            before = before.slice(0, -1);
            after = after.slice(1);
            bracketed = true;
        }
        let removeStart: number;
        let removeEnd: number;
        if (before === "") {
            const separator = prefixSeparator(after, bracketed || options.prefixAfterSpace, bracketed);
            if (separator === null) {
                return null;
            }
            removeStart = 0;
            removeEnd = text.length - after.length + separator.length;
            capitalize ||= /^[\p{Lu}\p{Lt}]/u.test(match[0]);
        } else if (after === "") {
            const separator = suffixSeparator(before, bracketed || options.suffixAfterSpace, bracketed);
            if (separator === null) {
                return null;
            }
            removeStart = before.length - separator.length;
            removeEnd = text.length;
        } else {
            return null;
        }
        edit.remove(removeStart, removeEnd);
        const left = edit.text;
        if (left.trim() === "" || BAD_START.test(left) || BAD_END.test(left)) {
            return null;
        }
    }
    if (capitalize) {
        capitalizeStart(edit);
    }
    return edit;
}

/**
 * The separator after a label at the start of a name, which `after` follows:
 * a punctuation mark, or whitespace where `space` allows it. With `bracketed`
 * the label was in brackets, which separate it already. Null for none.
 */
function prefixSeparator(after: string, space: boolean, bracketed: boolean): string | null {
    const label = LABEL_SEPARATOR.exec(after)?.[0];
    if (label !== undefined) {
        return label;
    }
    const whitespace = after.slice(0, after.length - after.trimStart().length);
    if (bracketed) {
        return whitespace;
    }
    return space && whitespace !== "" && WORD_START.test(after.slice(whitespace.length)) ? whitespace : null;
}

/** The separator before a label at the end of a name, which `before` precedes. */
function suffixSeparator(before: string, space: boolean, bracketed: boolean): string | null {
    const label = LABEL_SEPARATOR.exec(Array.from(before).reverse().join(""))?.[0];
    if (label !== undefined) {
        return before.slice(before.length - label.length);
    }
    const whitespace = before.slice(before.trimEnd().length);
    if (bracketed) {
        return whitespace;
    }
    return space && whitespace !== "" && WORD_END.test(before.slice(0, before.length - whitespace.length)) ? whitespace : null;
}

/**
 * Makes the first word of a name start the way ui/sentence-case would have it,
 * as "Open note" or "PDF export", but only by raising letters: it lowers none.
 * Its helper only knows ASCII words, so a first word that starts with a lower
 * case letter outside ASCII, as "über", gets its first letter raised here.
 */
function capitalizeStart(edit: StringEdit): void {
    const text = edit.text;
    const firstWord = /^\S+/u.exec(text)?.[0] ?? "";
    const cased = sentenceCaseSuggestion(text);
    let raised = false;
    if (cased.length === text.length) {
        for (let i = 0; i < firstWord.length; i++) {
            if (cased[i] !== text[i] && cased[i] === text[i].toUpperCase()) {
                edit.recase(i, () => cased[i]);
                raised = true;
            }
        }
    }
    if (!raised && /^[^\p{ASCII}]/u.test(text) && /^\p{Ll}/u.test(text) && !/\p{Lu}/u.test(firstWord)) {
        edit.recase(0, (char) => char.toUpperCase());
    }
}
