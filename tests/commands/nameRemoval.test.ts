import assert from "node:assert";
import { COMMAND } from "../../lib/rules/commands/commandWord.js";
import { removePhrase } from "../../lib/rules/commands/nameRemoval.js";
import { phrasePattern } from "../../lib/rules/commands/words.js";
import { removePhrase as referenceRemovePhrase } from "./nameRemovalReference.js";

// Pieces that the names are made of: the phrases, every kind of separator and
// bracket, words in either case, and characters outside ASCII.
const PIECES = [
    "Command", "command", "Word Tally", "word  tally", "Zoom", "zoom",
    ":", ": ", " : ", " - ", "-", " -- ", "|", " / ", "—", "–", "»", "·",
    "(", ")", "[", "]", " ", "  ", "\t",
    "open", "Note", "pdf", "über", "😀", "x2", "\"", "'", ",", ".", "Commander",
];

// A deterministic pseudo-random sequence, so a failure can be run again.
function* names(count: number): Generator<string> {
    let seed = 1;
    const next = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed;
    };
    for (let i = 0; i < count; i++) {
        const length = 1 + (next() % 8);
        let name = "";
        for (let j = 0; j < length; j++) {
            name += PIECES[next() % PIECES.length];
        }
        yield name;
    }
}

describe("removePhrase", () => {
    it("removes what the quadratic version removed", () => {
        const patterns = [COMMAND, phrasePattern("Word Tally")!, phrasePattern("Zoom")!];
        const optionSets = [
            { prefixAfterSpace: false, suffixAfterSpace: true },
            { prefixAfterSpace: true, suffixAfterSpace: false },
            { prefixAfterSpace: true, suffixAfterSpace: true },
            { prefixAfterSpace: false, suffixAfterSpace: false },
        ];
        let compared = 0;
        let removed = 0;
        for (const name of names(20000)) {
            const raw = JSON.stringify(name);
            for (const pattern of patterns) {
                for (const options of optionSets) {
                    const actual = removePhrase(name, pattern, options);
                    const expected = referenceRemovePhrase(name, pattern, options);
                    assert.deepStrictEqual(
                        actual && { text: actual.text, source: actual.toSource(raw) },
                        expected && { text: expected.text, source: expected.toSource(raw) },
                        `${raw} with ${String(pattern)} and ${JSON.stringify(options)}`,
                    );
                    compared++;
                    if (actual) {
                        removed++;
                    }
                }
            }
        }
        // The names must exercise removals, not only refusals
        assert.ok(removed > compared / 50, `only ${removed} of ${compared} removed anything`);
    });

    it("takes linear time on a name made of many labels", () => {
        const name = `${"Command: ".repeat(50000)}open`;
        const start = performance.now();
        const edit = removePhrase(name, COMMAND, { prefixAfterSpace: false, suffixAfterSpace: true });
        assert.strictEqual(edit?.text, "Open");
        // The quadratic version took minutes on this name
        assert.ok(performance.now() - start < 2000);
    });
});
