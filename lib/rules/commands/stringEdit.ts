// Editing the value of a string literal in a command object, for the
// suggestions of the command rules. The rules match the value a string
// evaluates to, so a suggestion works on that value too; writing it back keeps
// the quotes and every escape outside what it removes.

/** A character of a string literal's body as written, and what it stands for. */
interface StringUnit {
    source: string;
    value: string;
}

// The escapes that stand for a control character, such as "\n" for a line
// feed. Any other escaped character, as in "\'", stands for itself.
const CONTROL_ESCAPES: Readonly<Record<string, string>> = {
    b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v",
};

/**
 * Splits the source of a single- or double-quoted string literal, quotes
 * included, into the characters and escapes of its body. A line continuation
 * stands for nothing. Null for anything else, and for an escape this does not
 * decode, such as a legacy octal one.
 */
function stringUnits(raw: string): StringUnit[] | null {
    const quote = raw[0];
    if ((quote !== "'" && quote !== "\"") || raw.length < 2 || raw[raw.length - 1] !== quote) {
        return null;
    }
    const body = raw.slice(1, -1);
    const units: StringUnit[] = [];
    let i = 0;
    while (i < body.length) {
        if (body[i] !== "\\") {
            const text = String.fromCodePoint(body.codePointAt(i) ?? 0);
            units.push({ source: text, value: text });
            i += text.length;
            continue;
        }
        const next = body[i + 1];
        let length: number;
        let value: string;
        if (next === undefined) {
            return null;
        } else if (next === "\r") {
            length = body[i + 2] === "\n" ? 3 : 2;
            value = "";
        } else if (next === "\n" || next === "\u2028" || next === "\u2029") {
            length = 2;
            value = "";
        } else if (next === "x" || next === "u") {
            const braced = next === "u" && body[i + 2] === "{";
            const start = braced ? i + 3 : i + 2;
            const end = braced ? body.indexOf("}", start) : start + (next === "x" ? 2 : 4);
            const hex = end < 0 ? "" : body.slice(start, end);
            if (!/^[0-9a-fA-F]+$/u.test(hex) || (!braced && hex.length !== end - start)) {
                return null;
            }
            const codePoint = parseInt(hex, 16);
            if (codePoint > 0x10ffff) {
                return null;
            }
            length = (braced ? end + 1 : end) - i;
            value = String.fromCodePoint(codePoint);
        } else if (/[0-9]/u.test(next)) {
            // Only "\0" not followed by a digit; legacy octal escapes are left alone
            if (next !== "0" || /[0-9]/u.test(body[i + 2] ?? "")) {
                return null;
            }
            length = 2;
            value = "\0";
        } else {
            const escaped = String.fromCodePoint(body.codePointAt(i + 1) ?? 0);
            length = 1 + escaped.length;
            value = CONTROL_ESCAPES[escaped] ?? escaped;
        }
        units.push({ source: body.slice(i, i + length), value });
        i += length;
    }
    return units;
}

function decodedValue(units: readonly StringUnit[]): string {
    return units.map((unit) => unit.value).join("");
}

/**
 * A string value being edited: which UTF-16 units of the original value are
 * left, and how each of them is now cased. Indices are into the current text.
 */
export class StringEdit {
    readonly original: string;
    // The index in the original of each unit that is left, and the unit now
    private readonly kept: number[];
    private readonly chars: string[];

    constructor(original: string) {
        this.original = original;
        this.kept = Array.from({ length: original.length }, (_, i) => i);
        this.chars = original.split("");
    }

    get text(): string {
        return this.chars.join("");
    }

    /** Removes the units from `start` up to `end`. */
    remove(start: number, end: number): void {
        this.kept.splice(start, end - start);
        this.chars.splice(start, end - start);
    }

    /**
     * Changes the case of the character at `index` with `change`. Does nothing
     * where the change would not be one UTF-16 unit, as for "ß", or the unit
     * is half of a surrogate pair.
     */
    recase(index: number, change: (char: string) => string): void {
        const char = this.chars[index];
        if (char === undefined || /[\uD800-\uDFFF]/u.test(char)) {
            return;
        }
        const changed = change(char);
        if (changed.length === 1) {
            this.chars[index] = changed;
        }
    }

    /**
     * The source of the string literal `raw`, which evaluates to the original
     * value, rewritten to evaluate to the current text: the quotes and every
     * escape that is left stay as written. Null where that cannot be done: an
     * escape is only partly removed, a letter to recase is written as an
     * escape, or what is left would read differently, as "\0" before a digit.
     */
    toSource(raw: string): string | null {
        const units = stringUnits(raw);
        if (!units || decodedValue(units) !== this.original) {
            return null;
        }
        const keptChars = new Map<number, string>();
        this.kept.forEach((originalIndex, i) => keptChars.set(originalIndex, this.chars[i]));
        const parts: string[] = [];
        let position = 0;
        for (const unit of units) {
            const start = position;
            position += unit.value.length;
            if (unit.value === "") {
                // A line continuation goes with what is removed on either side of it
                if (
                    (start === 0 || keptChars.has(start - 1)) &&
                    (start === this.original.length || keptChars.has(start))
                ) {
                    parts.push(unit.source);
                }
                continue;
            }
            const left = Array.from({ length: unit.value.length }, (_, k) => keptChars.get(start + k));
            if (left.every((char) => char === undefined)) {
                continue;
            }
            if (left.some((char) => char === undefined)) {
                return null;
            }
            const now = left.join("");
            if (now === unit.value) {
                parts.push(unit.source);
            } else if (unit.source === unit.value) {
                parts.push(now);
            } else {
                return null;
            }
        }
        const quote = raw[0];
        const source = quote + parts.join("") + quote;
        const check = stringUnits(source);
        return check && decodedValue(check) === this.text ? source : null;
    }
}
