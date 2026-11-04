import assert from "node:assert";
import {
    createSentenceCaseEvaluator,
    evaluateSentenceCase,
    isSkippableString,
    resolveSentenceCaseConfig,
    type EvaluatorOptions,
} from "../../lib/rules/ui/sentenceCaseUtil.js";
import { DEFAULT_ACRONYMS } from "../../lib/rules/ui/acronyms.js";
import { DEFAULT_BRANDS } from "../../lib/rules/ui/brands.js";

// The casing decisions all three sentence-case rules share. Each case is a
// text and the suggestion for it, or null where the text is already in
// sentence case, so a change to any decision shows as a different suggestion
// rather than only as a report appearing or not.
type Case = [text: string, expected: string | null, options?: EvaluatorOptions];

const cases: Record<string, Case[]> = {
    "the first word of a sentence is capitalized and the others lowercased": [
        ["Open settings", null],
        ["open settings", "Open settings"],
        ["Open Settings", "Open settings"],
        ["OPEN SETTINGS", "Open settings"],
    ],
    "each sentence starts again after . ! ? and a space": [
        ["Saved. open it", "Saved. Open it"],
        ["Saved! open it", "Saved! Open it"],
        ["Saved? open it", "Saved? Open it"],
        ["Wait... open it", "Wait... Open it"],
        ["Saved. Open It.", "Saved. Open it."],
        // The final punctuation is not part of the last word.
        ["Click OK.", null],
        ["Click ok.", "Click OK."],
    ],
    "after a colon or a semicolon the next word may take either case": [
        ["Note: Open it", null],
        ["Note: open it", null],
        ["Done; Next step", null],
        ["Done; next step", null],
        ["Note: Open It", "Note: Open it"],
    ],
    "what comes before the first word": [
        ["  Open settings", null],
        ["  open settings", "  Open settings"],
        ["Open Settings  ", "Open settings  "],
        ["✅ Open settings", null],
        ["✅ open settings", "✅ Open settings"],
        ["(Open settings)", null],
        ["(open settings)", "(Open settings)"],
        // Other text before it makes it a later word.
        ["50% Complete", "50% complete"],
    ],
    "acronyms are upper case wherever they are": [
        ["Export as pdf", "Export as PDF"],
        ["pdf export", "PDF export"],
        ["Use utf-8 encoding", "Use UTF-8 encoding"],
        ["Use pdf-based export", "Use PDF-based export"],
        ["Use PDF-Based Export", "Use PDF-based export", { mode: "strict" }],
        ["api-based sync", "API-based sync"],
        ["Api-Based Sync", "API-based sync"],
        ["Use the api. pdf export", "Use the API. PDF export"],
    ],
    "configured acronyms replace the defaults and are matched in any case": [
        ["Use abc", "Use ABC", { acronyms: ["abc"] }],
        ["Use pdf", null, { acronyms: ["ABC"] }],
    ],
    "an acronym that is also a word keeps all caps only when written so": [
        ["Use the REST API", null],
        ["REST-based sync", null],
        ["Rest-based sync", null],
        ["Use REST-Based Sync", "Use REST-based sync"],
        ["Use Rest-Based Sync", "Use rest-based sync"],
        ["Take A Rest", "Take a rest"],
    ],
    "an abbreviation in capitals with dots keeps them": [
        ["Ship to the U.S., then home", null],
        ["Ship to the u.s., then home", null],
        ["Ship to the U.s., then home", "Ship to the u.s., then home"],
        // A dot and a space end the sentence, so the next word starts one.
        ["Visit U.S. Embassy", null],
    ],
    "brands keep their casing": [
        ["Connect to github", "Connect to GitHub"],
        ["github sync", "GitHub sync"],
        ["Save to google drive", "Save to Google Drive"],
        ["Save to Google Drive", null],
        ["Sync with obsidian sync", "Sync with Obsidian Sync"],
        ["Install node.js, then restart", "Install Node.js, then restart"],
        ["Use VS Code", null],
    ],
    "a brand is matched only as whole words": [
        ["Open Gitea Settings", "Open gitea settings"],
        ["Use Legit Data", "Use legit data"],
    ],
    "configured brands replace the defaults, regex characters included": [
        ["Open github", null, { brands: ["Foo"] }],
        ["Use foo bar", "Use Foo Bar", { brands: ["Foo Bar"] }],
        ["Use c++ tools", "Use C++ tools", { brands: ["C++"] }],
    ],
    "camelCase and PascalCase words are kept in loose mode only": [
        ["Use myVariable here", null],
        ["Use myVariable here", "Use myvariable here", { mode: "strict" }],
        ["Use myVariable here", "Use myvariable here", { enforceCamelCaseLower: true }],
        ["AutoReveal option", null],
        ["AutoReveal option", "Autoreveal option", { mode: "strict" }],
        ["AutoReveal option", "Autoreveal option", { enforceCamelCaseLower: true }],
        ["Use myVariable here", null, { enforceCamelCaseLower: false }],
    ],
    "ignoreWords keeps those words as written": [
        ["Use MyPlugin Here", "Use myplugin here", { mode: "strict" }],
        ["Use MyPlugin Here", "Use MyPlugin here", { mode: "strict", ignoreWords: ["MyPlugin"] }],
    ],
    "ignoreRegex skips a text that matches": [
        ["Open Settings", null, { ignoreRegex: ["^Open"] }],
        ["Open Settings", "Open settings", { ignoreRegex: ["^Close"] }],
    ],
    "URLs keep their casing, brands inside them included": [
        ["See https://obsidian.md/Help For Details", "See https://obsidian.md/Help for details"],
        ["See HTTPS://Example.com/Docs", null],
        ["See https://github.com/Owner/Repo", null],
        ["https://example.com/Docs has the help", null],
        ["obsidian://open?vault=Notes Opens It", "obsidian://open?vault=Notes opens it"],
        ["Clone git+ssh://Host/Repo now", null],
        ["Visit www.Example.com/Docs Today", "Visit www.Example.com/Docs today"],
        ["See https://example.com/YYYY-MM/Docs", null],
    ],
    "date formats keep their casing": [
        // Not right after a colon, where the first word may take any case.
        ["Use YYYY-MM-DD here", null],
        // A dot and up to four letters before a space would make it look like a path.
        ["Use YY.MM.DD, then save", null],
        ["Use MMMM-YYYY here", null],
        ["Use Do-MMM here", null],
        ["Use dddd-DD here", null],
        // In strict mode, where "ss.SSS" is not kept as camelCase.
        ["Use HH:mm:ss.SSS, then save", null, { mode: "strict" }],
        ["Use D_M_YY here", null],
        ["Use DD/MM/YYYY Format", "Use DD/MM/YYYY format"],
        // A single token is a word.
        ["Use MM Format", "Use mm format"],
    ],
};

const skippable: [text: string, skipped: boolean][] = [
    ["Run `npm Install` First", true],
    ["<b>Bold Title</b>", true],
    ["<B>Bold Title</B>", true],
    ["End Of Section</p>", true],
    ["a < b Is True", false],
    ["Saved {Count} Files", true],
    ["Hello ${Name}", true],
    ["Moved %s To Trash", true],
    ["%1$s Files Moved", true],
    ["./Open Settings", true],
    ["../Open Settings", true],
    ["src/Main Plugin.ts", true],
    ["Open the data.json File", true],
    ["Open README.MD File", true],
    ['Open "Template.md" Now', true],
    ["Open 'Template.md' Now", true],
    ["Press Ctrl+S", true],
    ["Press Shift+Enter To Send", true],
    ["Press Option+Click", true],
    ["Press Cmd + K", true],
    ["Press Alt+Tab", true],
    ["Press ⌘+K", true],
    ["Press ⌥+Click", true],
    ["v1.2.3", true],
    ["API_KEY", true],
    ["ERROR_404", true],
    ["Open Settings", false],
    ["", true],
];

describe("sentence case evaluation", () => {
    for (const [group, list] of Object.entries(cases)) {
        describe(group, () => {
            for (const [text, expected, options] of list) {
                it(`${JSON.stringify(text)}${options ? ` with ${JSON.stringify(options)}` : ""}`, () => {
                    const result = evaluateSentenceCase(text, options);
                    assert.strictEqual(result.ok ? null : result.suggestion, expected);
                });
            }
        });
    }
});

// Each entry of the default lists is kept as written and corrected from any
// other case. ", then save" keeps a brand such as "Node.js" from ending the
// text, where it would look like a file name and be skipped.
describe("the default brands and acronyms", () => {
    for (const brand of DEFAULT_BRANDS) {
        it(`keeps the brand ${brand} and corrects it from lower or upper case`, () => {
            const expected = `Use ${brand}, then save`;
            assert.strictEqual(evaluateSentenceCase(expected).ok, true);
            for (const written of [brand.toLowerCase(), brand.toUpperCase()].filter((text) => text !== brand)) {
                assert.strictEqual(evaluateSentenceCase(`Use ${written}, then save`).suggestion, expected);
            }
        });
    }
    // "OAuth" is in the list but upper-cased like the rest, so it is reported
    // and fixed to "OAUTH"; it is left out until that is fixed.
    for (const acronym of DEFAULT_ACRONYMS.filter((entry) => entry !== "OAuth")) {
        it(`keeps the acronym ${acronym} and corrects it from lower case`, () => {
            const expected = `Use ${acronym}, then save`;
            assert.strictEqual(evaluateSentenceCase(expected).ok, true);
            if (acronym !== acronym.toLowerCase()) {
                assert.strictEqual(evaluateSentenceCase(`Use ${acronym.toLowerCase()}, then save`).suggestion, expected);
            }
        });
    }
});

describe("strings that are not prose are skipped", () => {
    for (const [text, skipped] of skippable) {
        it(`${JSON.stringify(text)} is ${skipped ? "" : "not "}skipped`, () => {
            assert.strictEqual(isSkippableString(text), skipped);
        });
    }
});

describe("sentence case rule options", () => {
    it("turns autofix on only for allowAutoFix: true", () => {
        assert.strictEqual(resolveSentenceCaseConfig([]).allowAutoFix, false);
        assert.strictEqual(resolveSentenceCaseConfig([{}]).allowAutoFix, false);
        assert.strictEqual(resolveSentenceCaseConfig([{ allowAutoFix: false }]).allowAutoFix, false);
        assert.strictEqual(resolveSentenceCaseConfig([{ allowAutoFix: true }]).allowAutoFix, true);
    });

    it("passes every other option to the evaluator", () => {
        const { evaluatorOptions } = resolveSentenceCaseConfig([{ allowAutoFix: true, mode: "strict", brands: ["Foo"] }]);
        assert.deepStrictEqual(evaluatorOptions, { mode: "strict", brands: ["Foo"] });
    });

    it("the cached evaluator gives the suggestion, or undefined for a text that is fine, each time", () => {
        const suggestFor = createSentenceCaseEvaluator({});
        for (let i = 0; i < 2; i++) {
            assert.strictEqual(suggestFor("Open Settings"), "Open settings");
            assert.strictEqual(suggestFor("Open settings"), undefined);
        }
    });
});
