// What the suggestions of the name rules remove from a command name: the
// phrase the rule reports, and the separator that goes with it.

import { sentenceCaseSuggestion } from "../ui/sentenceCaseUtil.js";
import { StringEdit } from "./stringEdit.js";

// What separates a label from the rest of a command name, as in
// "Word Tally: Count words" or "Count words - Word Tally". A hyphen needs
// whitespace on both sides, since "Git-based" is one word. It reads the same
// backwards, so suffixSeparator() finds the one at the end of a text by
// reading it from the end back.
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
 *
 * What is left is always one piece of the name, from `lo` up to `hi`, so the
 * labels are taken off its ends by moving those, and the name is only cut
 * once at the end: a name made of many labels takes linear time, not
 * quadratic.
 */
export function removePhrase(name: string, pattern: RegExp, options: PhraseRemovalOptions): StringEdit | null {
    const search = new RegExp(pattern.source, `${pattern.flags.replace(/[gy]/gu, "")}g`);
    let lo = 0;
    let hi = name.length;
    let capitalize = false;
    for (;;) {
        const match = firstMatchWithin(search, name, lo, hi);
        if (!match) {
            break;
        }
        const start = match.index;
        const end = start + match[0].length;
        // What is left of the name before the phrase is name[lo, beforeEnd),
        // and after it name[afterStart, hi).
        let beforeEnd = start;
        let afterStart = end;
        let bracketed = false;
        const closing = beforeEnd > lo ? CLOSING_BRACKET[name[beforeEnd - 1]] : undefined;
        if (closing !== undefined && afterStart < hi && name[afterStart] === closing) {
            beforeEnd--;
            afterStart++;
            bracketed = true;
        }
        if (beforeEnd === lo) {
            const separator = prefixSeparator(name, afterStart, hi, bracketed || options.prefixAfterSpace, bracketed);
            if (separator === null) {
                return null;
            }
            lo = afterStart + separator;
            capitalize ||= /^[\p{Lu}\p{Lt}]/u.test(match[0]);
        } else if (afterStart === hi) {
            const separator = suffixSeparator(name, lo, beforeEnd, bracketed || options.suffixAfterSpace, bracketed);
            if (separator === null) {
                return null;
            }
            hi = beforeEnd - separator;
        } else {
            return null;
        }
        // Nothing left, or what is left starts or ends with a separator; a
        // name of only whitespace starts with whitespace.
        if (lo >= hi || BAD_START.test(name[lo]) || BAD_END.test(name[hi - 1])) {
            return null;
        }
    }
    const edit = new StringEdit(name);
    edit.remove(hi, name.length);
    edit.remove(0, lo);
    if (capitalize) {
        capitalizeStart(edit);
    }
    return edit;
}

/**
 * The first match of `search`, a global pattern, that is wholly in
 * name[lo, hi). What comes before `lo` and from `hi` on is always a separator
 * or a bracket, which the phrase's own word boundaries treat like the ends of
 * the text.
 */
function firstMatchWithin(search: RegExp, name: string, lo: number, hi: number): RegExpExecArray | null {
    search.lastIndex = lo;
    for (;;) {
        const match = search.exec(name);
        if (!match || match.index >= hi) {
            return null;
        }
        if (match.index + match[0].length <= hi) {
            return match;
        }
        search.lastIndex = match.index + 1;
    }
}

const LABEL_SEPARATOR_AT = new RegExp(LABEL_SEPARATOR.source.replace(/^\^/u, ""), "uy");
const SEPARATOR_MARK = /^[:|/>»›→<«‹←·•–—]$/u;
const WHITESPACE = /^\s$/u;
const WORD_START_AT = new RegExp(WORD_START.source.replace(/^\^/u, ""), "uy");

/**
 * The length of the separator after a label at the start of a name, which
 * name[at, hi) follows: a punctuation mark, or whitespace where `space`
 * allows it. With `bracketed` the label was in brackets, which separate it
 * already. Null for none.
 */
function prefixSeparator(name: string, at: number, hi: number, space: boolean, bracketed: boolean): number | null {
    LABEL_SEPARATOR_AT.lastIndex = at;
    let label = LABEL_SEPARATOR_AT.exec(name)?.[0];
    if (label !== undefined && at + label.length > hi) {
        // It runs into what was cut off the end: match the rest alone
        label = LABEL_SEPARATOR.exec(name.slice(at, hi))?.[0];
    }
    if (label !== undefined) {
        return label.length;
    }
    let wordAt = at;
    while (wordAt < hi && WHITESPACE.test(name[wordAt])) {
        wordAt++;
    }
    const whitespace = wordAt - at;
    if (bracketed) {
        return whitespace;
    }
    if (!space || whitespace === 0 || wordAt >= hi) {
        return null;
    }
    WORD_START_AT.lastIndex = wordAt;
    const word = WORD_START_AT.exec(name);
    return word !== null && wordAt + word[0].length <= hi ? whitespace : null;
}

/**
 * The length of the separator before a label at the end of a name, which
 * name[lo, at) precedes. LABEL_SEPARATOR reads the same backwards, so this
 * reads it from `at` back.
 */
function suffixSeparator(name: string, lo: number, at: number, space: boolean, bracketed: boolean): number | null {
    const skipWhitespace = (from: number): number => {
        let i = from;
        while (i > lo && WHITESPACE.test(name[i - 1])) {
            i--;
        }
        return i;
    };
    const afterWhitespace = skipWhitespace(at);
    // Whitespace, a mark, whitespace
    if (afterWhitespace > lo && SEPARATOR_MARK.test(name[afterWhitespace - 1])) {
        return at - skipWhitespace(afterWhitespace - 1);
    }
    // Whitespace, hyphens, whitespace
    if (afterWhitespace < at) {
        let i = afterWhitespace;
        while (i > lo && name[i - 1] === "-") {
            i--;
        }
        if (i < afterWhitespace) {
            const start = skipWhitespace(i);
            if (start < i) {
                return at - start;
            }
        }
    }
    const whitespace = at - afterWhitespace;
    if (bracketed) {
        return whitespace;
    }
    if (!space || whitespace === 0 || afterWhitespace === lo) {
        return null;
    }
    // The character before the whitespace, both halves of a surrogate pair
    let charStart = afterWhitespace - 1;
    if (charStart > lo && /[\uDC00-\uDFFF]/u.test(name[charStart]) && /[\uD800-\uDBFF]/u.test(name[charStart - 1])) {
        charStart--;
    }
    return WORD_END.test(name.slice(charStart, afterWhitespace)) ? whitespace : null;
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
