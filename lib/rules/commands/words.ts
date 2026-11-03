// Whole-word matching for the command rules, so that a plugin named "Git"
// does not match "Open digital garden" and "command" does not match
// "Commander".

// A letter, digit or combining mark in any script. JavaScript's \b only knows
// ASCII, so it would end a word before the "ü" of "Gitü".
const WORD_CHAR = String.raw`[\p{L}\p{N}\p{M}]`;

function escapeRegExp(text: string): string {
    return text.replace(/[\\^$.*+?()[\]{}|]/gu, String.raw`\$&`);
}

/**
 * A pattern that finds `phrase` in a command name as whole words, in any
 * case: with no letter or digit right before or after it. The words of a
 * multi-word phrase may be separated by any whitespace. Null for a phrase
 * with no words, which would otherwise match everywhere.
 */
export function phrasePattern(phrase: string): RegExp | null {
    const words = phrase.trim().split(/\s+/u).filter((word) => word !== "");
    if (words.length === 0) {
        return null;
    }
    const pattern = words.map(escapeRegExp).join(String.raw`\s+`);
    return new RegExp(`(?<!${WORD_CHAR})${pattern}(?!${WORD_CHAR})`, "iu");
}

// A word of an ID: an acronym that a capitalized word follows ("PDF" in
// "PDFExport"), capitals and then other letters or digits ("Export", "my",
// "base64"), or capitals alone ("PDF"). Anything else separates words.
const ID_WORD = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}*[\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{N}\p{M}]+|\p{Lu}+/gu;

/**
 * The words of an ID, lower-cased. An ID is an identifier rather than prose:
 * its words are joined by separators (`open-note`, `open_note`, `editor:open`)
 * or by camelCase (`openNote`, `PDFExport`), so a word is a run of letters and
 * digits that a separator or a camelCase hump ends.
 */
export function idWords(id: string): string[] {
    return (id.match(ID_WORD) ?? []).map((word) => word.toLowerCase());
}

/** Whether `words` contain all of `wanted`, together and in order. */
export function containsWords(words: readonly string[], wanted: readonly string[]): boolean {
    for (let start = 0; start + wanted.length <= words.length; start++) {
        if (wanted.every((word, i) => words[start + i] === word)) {
            return true;
        }
    }
    return false;
}
