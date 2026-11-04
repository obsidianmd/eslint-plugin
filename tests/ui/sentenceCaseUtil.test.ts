import assert from "node:assert";
import {
    createSentenceCaseEvaluator,
    evaluateSentenceCase,
    isSkippableString,
    recaseStringSource,
    resolveSentenceCaseConfig,
    type EvaluatorOptions,
} from "../../lib/rules/ui/sentenceCaseUtil.js";
import { DEFAULT_ACRONYMS } from "../../lib/rules/ui/acronyms.js";
import { DEFAULT_AMBIGUOUS_BRANDS, DEFAULT_BRANDS } from "../../lib/rules/ui/brands.js";

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
    "after an abbreviation such as e.g. the next word may take either case": [
        ["Choose a folder, e.g. notes", null],
        ["Choose a folder, e.g. Notes", null],
        ["Pick one, eg. notes", null],
        ["Use any file, i.e. one note", null],
        ["Images, videos, etc. are kept", null],
        ["Images, videos, etc. Are kept", null],
        ["Compare local vs. remote", null],
        ["See the guide, cf. the docs", null],
        ["It takes approx. ten seconds", null],
        ["Notes, incl. archived ones", null],
        ["Notes, esp. new ones", null],
        ["No. of items", null],
        // Only the next word: the words after it are later words.
        ["Choose a folder, e.g. Daily Notes", "Choose a folder, e.g. Daily notes"],
        // A word that only ends like one is not an abbreviation.
        ["Eat your veg. open it", "Eat your veg. Open it"],
        ["Saved files. open it", "Saved files. Open it"],
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
        // So does a number: the word after it is not capitalized.
        ["2 files selected", null],
        ["2 Files selected", "2 files selected"],
        ["10 GitHub repos found", null],
        ["2 api keys found", "2 API keys found"],
        ["1) open settings", null],
        // A word that starts with a number keeps its letters as written.
        ["1st place", null],
        ["10x faster", null],
        ["10X faster", null],
        ["3D view", null],
        ["2-factor sign-in", null],
        ["2fa settings", "2FA settings"],
        ["10x Faster", "10x faster"],
        // Emoji with a variation selector, a skin tone, a flag or a keycap are not text.
        ["⚠️ Open settings", null],
        ["⚠️ open settings", "⚠️ Open settings"],
        ["👍🏽 Open settings", null],
        ["🇬🇧 Open settings", null],
        ["1️⃣ Open settings", null],
        ["#️⃣ Open settings", null],
        // "#" and "*" are skipped, as before.
        ["* Required field", null],
        // A first word in quotes keeps the case it is written in.
        ['"Open" settings', null],
        ['"open" settings', null],
        ["'Open' settings", null],
        ["“Open” settings", null],
        ["(“Open”) settings", null],
        ['"Open" Settings', '"Open" settings'],
        ['"Open Settings" now', '"Open settings" now'],
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
    "an acronym in mixed case keeps the casing it is listed in": [
        ["Sign in with OAuth", null],
        ["Sign in with oauth", "Sign in with OAuth"],
        ["Sign in with OAUTH", "Sign in with OAuth"],
        ["OAuth settings", null],
        ["oauth settings", "OAuth settings"],
        ["Use oauth-based sign-in", "Use OAuth-based sign-in"],
    ],
    "configured acronyms replace the defaults and are matched in any case": [
        ["Use abc", "Use ABC", { acronyms: ["abc"] }],
        ["Use pdf", null, { acronyms: ["ABC"] }],
        ["Use mytool", "Use MyTool", { acronyms: ["MyTool"] }],
        ["Use MYTOOL", "Use MyTool", { acronyms: ["MyTool"] }],
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
    "a brand that is also an ordinary word keeps either casing": [
        ["Close all windows", null],
        ["Install on Windows", null],
        ["Move the cursor to the end", null],
        ["Open in Cursor", null],
        ["Leave some slack", null],
        ["Post to Slack", null],
        ["Press x to close", null],
        ["Share on X", null],
        ["The notion of time", null],
        ["Import from Notion", null],
        ["Views react to changes", null],
        ["React to changes", null],
        ["Built with React", null],
        ["Close windows-only panes", null],
        // Any other casing is the brand's.
        ["Close all WINDOWS", "Close all Windows"],
        ["Import from nOTION", "Import from Notion"],
        // The first word of a sentence is still capitalized.
        ["windows are closed", "Windows are closed"],
        // The brand's casing is kept as written, even in title case.
        ["Close All Windows", "Close all Windows"],
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
        // A time format may end in an AM/PM token after a space.
        ["Format: hh:mm A", null],
        ["Use h:mm a here", null],
        ["Use HH:mm:ss A, then save", null],
        ["Use hh:mmA here", null],
        // "A" without a time format before it is a word.
        ["Create A new note", "Create a new note"],
        ["Note: Create A New Note", "Note: Create a new note"],
        ["Use DD/MM/YYYY A Format", "Use DD/MM/YYYY a format"],
    ],
    "a version number or a brand with a dot is checked": [
        ["Version 1.2 Released", "Version 1.2 released"],
        ["Install Node.js First", "Install Node.js first"],
        ["Install node.js First", "Install Node.js first"],
        ["Requires Obsidian 1.5.0 Or Later", "Requires Obsidian 1.5.0 or later"],
        ["Costs $1.99 Now", "Costs $1.99 now"],
        ['Version "1.2" Released', 'Version "1.2" released'],
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
    ["Open config.json", true],
    ["See docs/readme.md", true],
    ["Saved to Notes/Daily.md", true],
    ["Open Daily.md Now", true],
    ["Visit obsidian.md", true],
    ["https://x.com/a.b", true],
    ["Open https://X.com/A.b Now", true],
    ["C:\\Users\\Me\\File.txt", true],
    [".obsidian/plugins", true],
    ["Open .obsidian/plugins Folder", true],
    ["Edit the .git/config File", true],
    ["Saved backup.001 Here", true],
    ["Open Main.js Here", true],
    // A number, or a brand such as "Node.js", is not a file name.
    ["Version 1.2 Released", false],
    ["Update To v2.1 Now", false],
    ["Requires Obsidian 1.5.0 Or Later", false],
    ['Version "1.2" Released', false],
    ["Install Node.js First", false],
    ["Install Node.js", false],
    ["Uses Node.js 'Fs' Module", false],
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
// other case. A brand that is also an ordinary word is the only exception:
// written in lower case it is that word, and is left alone.
describe("the default brands and acronyms", () => {
    for (const brand of DEFAULT_BRANDS) {
        const ambiguous = DEFAULT_AMBIGUOUS_BRANDS.includes(brand);
        it(`keeps the brand ${brand} and corrects it from ${ambiguous ? "upper case, and keeps it in lower case" : "lower or upper case"}`, () => {
            const expected = `Use ${brand}, then save`;
            assert.strictEqual(evaluateSentenceCase(expected).ok, true);
            for (const written of [brand.toLowerCase(), brand.toUpperCase()].filter((text) => text !== brand)) {
                const keptAsWritten = ambiguous && written === brand.toLowerCase();
                assert.strictEqual(evaluateSentenceCase(`Use ${written}, then save`).suggestion, keptAsWritten ? undefined : expected);
            }
        });
    }
    it("lists only brands of the default list as ambiguous", () => {
        assert.deepStrictEqual(DEFAULT_AMBIGUOUS_BRANDS.filter((brand) => !DEFAULT_BRANDS.includes(brand)), []);
    });
    for (const acronym of DEFAULT_ACRONYMS) {
        it(`keeps the acronym ${acronym} and corrects it from lower and upper case`, () => {
            const expected = `Use ${acronym}, then save`;
            assert.strictEqual(evaluateSentenceCase(expected).ok, true);
            for (const written of [acronym.toLowerCase(), acronym.toUpperCase()].filter((text) => text !== acronym)) {
                assert.strictEqual(evaluateSentenceCase(`Use ${written}, then save`).suggestion, expected);
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

// The autofix of all three rules: the source of the string, rewritten so it
// holds the suggestion, with only the case of letters written as themselves
// changed. Null means no fix.
describe("rewriting a string's source for the fix", () => {
    const cases: [source: string, value: string, suggestion: string, expected: string | null][] = [
        [String.raw`'Open Settings'`, "Open Settings", "Open settings", String.raw`'Open settings'`],
        [String.raw`"Say \"Open\" Now"`, 'Say "Open" Now', 'Say "open" now', String.raw`"Say \"open\" now"`],
        [String.raw`'Open\tNow\\Here'`, "Open\tNow\\Here", "Open\tnow\\here", String.raw`'Open\tnow\\here'`],
        [String.raw`'\x4Fpen \u{1F600} Now'`, "Open \u{1F600} Now", "Open \u{1F600} now", String.raw`'\x4Fpen \u{1F600} now'`],
        [String.raw`'\u0041pply \0 Now'`, "Apply \0 Now", "Apply \0 now", String.raw`'\u0041pply \0 now'`],
        ["'Open \\\r\nNow'", "Open Now", "Open now", "'Open \\\r\nnow'"],
        ["`Open\r\nNow\rToo`", "Open\nNow\nToo", "Open\nnow\ntoo", "`Open\r\nnow\rtoo`"],
        ["`Open \\${x} Now`", "Open ${x} Now", "Open ${x} now", "`Open \\${x} now`"],
        // A letter to change is an escape.
        [String.raw`'Open \u0053ettings'`, "Open Settings", "Open settings", null],
        [String.raw`'Open \x53ettings'`, "Open Settings", "Open settings", null],
        [String.raw`'Open \Settings'`, "Open Settings", "Open settings", null],
        // A legacy octal escape is not decoded.
        [String.raw`'Open Settings\101'`, "Open SettingsA", "Open settingsa", null],
        [String.raw`'Open Settings\8'`, "Open Settings8", "Open settings8", null],
        // The source does not hold the value.
        [String.raw`'Open Now'`, "Open Later", "Open later", null],
        [String.raw`'Open \u00'`, "Open", "Open", null],
        [String.raw`'Open \u{110000}'`, "Open", "Open", null],
        // Not a quoted string, or not only a change of case.
        ["Open Now", "Open Now", "Open now", null],
        [String.raw`'Open Now"`, "Open Now", "Open now", null],
        [String.raw`'Open Now'`, "Open Now", "Open new", null],
        [String.raw`'Open Now'`, "Open Now", "Open now!", null],
    ];
    for (const [source, value, suggestion, expected] of cases) {
        it(`${JSON.stringify(source)} becomes ${JSON.stringify(expected)}`, () => {
            assert.strictEqual(recaseStringSource(source, value, suggestion), expected);
        });
    }
});
