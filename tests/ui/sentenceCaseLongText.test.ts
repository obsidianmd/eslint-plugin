import assert from "node:assert";
import {
    evaluateSentenceCase,
    isSkippableString,
    leadingLabelEnd,
    urlRanges,
} from "../../lib/rules/ui/sentenceCaseUtil.js";

// Long text on which a sentence-case regex retried its match from every
// position, or a check went over every earlier match: quadratic, 1 to 15 s
// per string when this was written. Linear code takes milliseconds; the limit
// leaves room for a loaded machine.
const LIMIT_MS = 500;

function elapsed(fn: () => unknown): number {
    const start = performance.now();
    fn();
    return performance.now() - start;
}

describe("sentence case on long text", () => {
    const inputs: Record<string, string> = {
        "many '<' and no '>'": "<a".repeat(50_000),
        "many '{' and no '}'": "{".repeat(60_000),
        "a long run of punctuation before a letter": "!".repeat(40_000) + "a",
        "a long run of spaces before a letter": " ".repeat(50_000) + "a",
        "a long dotted word that is not a URL": "x.".repeat(30_000) + "x!",
        "many brand names": "Open X ".repeat(15_000),
        "many URLs": "see a://b ".repeat(15_000),
        "an opening bracket that is never closed": "(" + "a".repeat(45_000),
        "many date format tokens that are not a format": "Do ".repeat(20_000) + "a",
    };
    for (const [name, text] of Object.entries(inputs)) {
        it(`${name}: linear time`, () => {
            const ms = elapsed(() => evaluateSentenceCase(text));
            assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
        });
    }

    // The file-name check alone: the rest of the evaluation of this much text
    // takes most of the limit by itself.
    it("many brand names that end in a file extension: linear time", () => {
        const text = "Node.js ".repeat(20_000);
        const ms = elapsed(() => assert.strictEqual(isSkippableString(text), false));
        assert.ok(ms < LIMIT_MS, `took ${ms.toFixed(0)} ms`);
    });
});

// Every string of up to `length` characters of `alphabet`.
function* strings(alphabet: readonly string[], length: number, prefix = ""): Generator<string> {
    yield prefix;
    if (length === 0) return;
    for (const char of alphabet) yield* strings(alphabet, length - 1, prefix + char);
}

describe("the linear checks decide as the regexes they replace", () => {
    it("isSkippableString(): HTML tags and placeholders", () => {
        // No "." or "`", no capital letter, "_" or "-": of the other checks,
        // only the all-caps one can hold, for a string of digits.
        const reference = (text: string) =>
            !text ||
            /<\/?[a-z][^>]*>/i.test(text) ||
            /(\$\{[^}]+\}|\{[^}]+\}|%\d*\$?s|%s)/.test(text) ||
            /^[A-Z0-9_]+$/.test(text);
        let checked = 0;
        for (const text of strings(["<", ">", "/", "a", "{", "}", "$", "%", "1", "s", " "], 5)) {
            assert.strictEqual(isSkippableString(text), reference(text), JSON.stringify(text));
            checked++;
        }
        assert.ok(checked > 150_000);
    });

    it("urlRanges()", () => {
        const URL = /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;
        const reference = (text: string): number[][] => [...text.matchAll(URL)].map((m) => [m.index, m.index + m[0].length]);
        for (const text of strings(["a", "B", "1", ".", "-", "_", ":", "/", " "], 6)) {
            assert.deepStrictEqual(urlRanges(text), reference(text), JSON.stringify(text));
        }
    });

    it("leadingLabelEnd()", () => {
        const LABEL = /^[^\p{L}\p{N}]*?[[(][^[\]()]*[A-Za-z0-9][^[\]()]*[\])]\s+(?=[A-Za-z0-9])/u;
        const reference = (text: string) => LABEL.exec(text)?.[0].length ?? -1;
        for (const text of strings(["(", ")", "[", "]", "a", "1", " ", "\t", "-", "é", "😀"], 6)) {
            assert.strictEqual(leadingLabelEnd(text), reference(text), JSON.stringify(text));
        }
    });

    it("on longer random strings", () => {
        const URL = /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;
        const LABEL = /^[^\p{L}\p{N}]*?[[(][^[\]()]*[A-Za-z0-9][^[\]()]*[\])]\s+(?=[A-Za-z0-9])/u;
        let seed = 1;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const pick = (pieces: string[]) => pieces[Math.floor(random() * pieces.length)];
        for (let n = 0; n < 20_000; n++) {
            let url = "";
            let label = "";
            for (let i = 0, length = 10 + Math.floor(random() * 30); i < length; i++) {
                url += pick(["a", "B", "1", ".", "-", "+", "_", ":", "/", " ", "\t", "x://", "https://"]);
                label += pick(["(", ")", "[", "]", "a", "Beta", "1", " ", "  ", "-", "• ", "é", "😀", "x)"]);
            }
            assert.deepStrictEqual(urlRanges(url), [...url.matchAll(URL)].map((m) => [m.index, m.index + m[0].length]), JSON.stringify(url));
            assert.strictEqual(leadingLabelEnd(label), LABEL.exec(label)?.[0].length ?? -1, JSON.stringify(label));
        }
    });
});
