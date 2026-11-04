import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { DEFAULT_AMBIGUOUS_BRANDS, DEFAULT_BRANDS } from "./brands.js";
import { DEFAULT_ACRONYMS, DEFAULT_CASE_AGNOSTIC_ACRONYMS } from "./acronyms.js";

export type Mode = "loose" | "strict";

export interface EvaluatorOptions {
    brands?: string[];
    acronyms?: string[];
    ignoreWords?: string[];
    ignoreRegex?: string[];
    mode?: Mode;
    enforceCamelCaseLower?: boolean;
}

export interface EvaluationResult {
    ok: boolean;
    suggestion?: string;
}

// Configuration options for sentence case rules including evaluator options and auto-fix setting
export interface SentenceCaseRuleConfig extends EvaluatorOptions {
    allowAutoFix?: boolean;
}

// Rule options array type for ESLint rule configuration
export type SentenceCaseRuleOptions = readonly [SentenceCaseRuleConfig?];

// Parameters for creating a sentence case violation reporter
export interface SentenceCaseReporterParams<MessageId extends string> {
    context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>;
    evaluatorOptions: EvaluatorOptions;
    allowAutoFix: boolean;
    messageId: MessageId;
}

// Function type for reporting sentence case violations
export type SentenceCaseReport = (node: TSESTree.Node, value: string) => void;

// Default configuration for sentence case rules
const defaultSentenceCaseConfig: SentenceCaseRuleConfig = {};

// Resolves rule options to configuration values
export function resolveSentenceCaseConfig(options: SentenceCaseRuleOptions): {
    config: SentenceCaseRuleConfig;
    evaluatorOptions: EvaluatorOptions;
    allowAutoFix: boolean;
} {
    const config = options[0] ?? defaultSentenceCaseConfig;
    const { allowAutoFix, ...rest } = config;
    const evaluatorOptions: EvaluatorOptions = rest;
    return {
        config,
        evaluatorOptions,
        allowAutoFix: allowAutoFix === true,
    };
}

// Creates a cached evaluator that returns the sentence-case suggestion for a
// string that needs one, and undefined for a string that is already fine. It
// is independent of the AST, so the JSON rule shares it with the ESTree rules.
export function createSentenceCaseEvaluator(
    evaluatorOptions: EvaluatorOptions,
): (value: string) => string | undefined {
    const cache = new Map<string, EvaluationResult>();

    return (value) => {
        const cached = cache.get(value);
        const result = cached ?? evaluateSentenceCase(value, evaluatorOptions);
        if (!cached) {
            cache.set(value, result);
        }
        return result.ok || !result.suggestion ? undefined : result.suggestion;
    };
}

// Creates a reporter function for sentence case violations with caching and
// auto-fix support. `node` is the string, or a string behind `as`,
// `satisfies` or `!`; the fix rewrites only the string, in place.
export function createSentenceCaseReporter<MessageId extends string>(
    params: SentenceCaseReporterParams<MessageId>,
): SentenceCaseReport {
    const suggestFor = createSentenceCaseEvaluator(params.evaluatorOptions);

    return (node, value) => {
        const suggestion = suggestFor(value);
        if (suggestion === undefined) {
            return;
        }

        const stringNode = params.allowAutoFix ? unwrapExpression(node) : null;
        const replacement = stringNode && getStaticStringValue(stringNode) === value
            ? recaseStringSource(params.context.sourceCode.getText(stringNode), value, suggestion)
            : null;

        params.context.report({
            node,
            messageId: params.messageId,
            data: {
                suggestion,
            },
            ...(stringNode && replacement !== null
                ? { fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(stringNode, replacement) }
                : {}),
        });
    };
}

// The text a string literal, or a template literal without `${…}`, evaluates
// to: its value, with every escape decoded, not its source
export function getStaticStringValue(node: TSESTree.Node): string | null {
    if (node.type === TSESTree.AST_NODE_TYPES.Literal) {
        return typeof node.value === "string" ? node.value : null;
    }
    if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? null;
    }
    return null;
}

// The escapes that stand for a control character, such as "\n" for a line
// feed. Any other escaped character, as in "\'", stands for itself.
const CONTROL_ESCAPES: Readonly<Record<string, string>> = {
    b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v",
};

// Decodes the body of a JavaScript string or template literal, or of a JSON
// string, and maps each UTF-16 unit of its value to the index in the body of
// the character that is written as itself, or to -1 for a unit that an escape
// or a template line break stands for. Returns null for an escape it does not
// decode, such as a legacy octal one.
function mapStringBody(body: string, template: boolean): { value: string; sourceIndex: number[] } | null {
    let value = "";
    const sourceIndex: number[] = [];
    const push = (text: string, index: number) => {
        value += text;
        for (let k = 0; k < text.length; k++) sourceIndex.push(index);
    };
    let i = 0;
    while (i < body.length) {
        const ch = body[i];
        if (template && ch === "\r") {
            // A template reads a CR LF or CR line break as LF
            push("\n", -1);
            i += body[i + 1] === "\n" ? 2 : 1;
            continue;
        }
        if (ch !== "\\") {
            push(ch, i);
            i++;
            continue;
        }
        const next = body[i + 1];
        if (next === undefined) return null;
        if (next === "\r") {
            // A line continuation adds nothing
            i += body[i + 2] === "\n" ? 3 : 2;
            continue;
        }
        if (next === "\n" || next === "\u2028" || next === "\u2029") {
            i += 2;
            continue;
        }
        if (next === "x" || next === "u") {
            const braced = next === "u" && body[i + 2] === "{";
            const start = braced ? i + 3 : i + 2;
            const end = braced ? body.indexOf("}", start) : start + (next === "x" ? 2 : 4);
            const hex = end < 0 ? "" : body.slice(start, end);
            if (!/^[0-9a-fA-F]+$/.test(hex) || (!braced && hex.length !== end - start)) return null;
            const codePoint = parseInt(hex, 16);
            if (codePoint > 0x10ffff) return null;
            push(String.fromCodePoint(codePoint), -1);
            i = braced ? end + 1 : end;
            continue;
        }
        if (/[0-9]/.test(next)) {
            // Only "\0" not followed by a digit; legacy octal escapes are left alone
            if (next !== "0" || /[0-9]/.test(body[i + 2] ?? "")) return null;
            push("\0", -1);
            i += 2;
            continue;
        }
        const codePoint = body.codePointAt(i + 1) ?? 0;
        const escaped = String.fromCodePoint(codePoint);
        push(CONTROL_ESCAPES[escaped] ?? escaped, -1);
        i += 1 + escaped.length;
    }
    return { value, sourceIndex };
}

// Rewrites the source of a string, a template literal without `${…}` or a JSON
// string, quotes included, so that it holds `suggestion` instead of `value`.
// Only letters written as themselves change case; the quotes, every escape
// and every line break stay as written. Returns null when that cannot be
// done: a letter to change is written as an escape (`\u0053`), the source
// does not decode to `value`, or the suggestion is not a change of case.
export function recaseStringSource(source: string, value: string, suggestion: string): string | null {
    const quote = source[0];
    if (source.length < 2 || source[source.length - 1] !== quote || !["'", "\"", "`"].includes(quote)) return null;
    if (suggestion.length !== value.length) return null;
    const body = source.slice(1, -1);
    const mapped = mapStringBody(body, quote === "`");
    if (!mapped || mapped.value !== value) return null;
    const chars = body.split("");
    for (let k = 0; k < value.length; k++) {
        if (suggestion[k] === value[k]) continue;
        const index = mapped.sourceIndex[k];
        if (index < 0 || suggestion[k].toLowerCase() !== value[k].toLowerCase()) return null;
        chars[index] = suggestion[k];
    }
    return quote + chars.join("") + quote;
}

// Type guard to check if an object has a physicalFilename property
function hasPhysicalFilename(value: unknown): value is { physicalFilename?: string } {
    return typeof value === "object" && value !== null && "physicalFilename" in value;
}

// Normalizes file paths by converting backslashes to forward slashes
function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/");
}

// Retrieves the filename from the ESLint rule context
export function getContextFilename<MessageId extends string>(
    context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>,
): string | null {
    if (hasPhysicalFilename(context) && typeof context.physicalFilename === "string") {
        return context.physicalFilename;
    }
    const filename = context.getFilename();
    return typeof filename === "string" ? filename : null;
}

// Checks if a file path matches the pattern for English locale files: a file
// or directory named "en" in any case, alone or followed by ".", "-" or "_"
// and more (en-US, en_GB, en.messages), with one of `extensions`. The
// recommendedWithLocalesEn globs in lib/index.ts select the same files; the
// extension is matched in its case, as ESLint matches those globs.
export function isEnglishLocalePath(
    filePath: string,
    extensions: readonly string[],
): boolean {
    const normalized = normalizePath(filePath);
    const normalizedExtensions = extensions.map((ext) => ext.replace(/^\./, ""));
    const extensionPattern = normalizedExtensions.map(escapeRegExp).join("|");
    const regex = new RegExp(
        `(?:^|/)[eE][nN](?:[._-][^/]+)?(?:/.*)?\\.(?:${extensionPattern})$`,
    );
    return regex.test(normalized);
}

// Type guard to check if an AST node is an expression node
export function isExpressionNode(node: TSESTree.Node | null | undefined): node is TSESTree.Expression {
    if (!node) return false;
    switch (node.type) {
        case "ArrayPattern":
        case "ObjectPattern":
        case "AssignmentPattern":
        case "RestElement":
        case "TSParameterProperty":
            return false;
        default:
            return true;
    }
}

// Unwraps TypeScript type assertions (`x as T`, `<T>x`), `satisfies` and
// non-null assertions to get the underlying expression. Parentheses leave no
// node in the AST, so they need no unwrapping.
export function unwrapExpression(
    node: TSESTree.Node | null | undefined,
): TSESTree.Expression | null {
    let current: TSESTree.Node | null | undefined = node;
    while (current) {
        if (
            current.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
            current.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
            current.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
            current.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression
        ) {
            current = current.expression;
            continue;
        }
        break;
    }
    return isExpressionNode(current) ? current : null;
}

// Escapes special regex characters in a string for safe use in RegExp patterns
function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Checks if a character is alphabetic (A-Z or a-z)
function isAlpha(ch: string): boolean {
    return /[A-Za-z]/.test(ch);
}

// Detects if text appears to be a file path. A brand such as "Node.js" and a
// number such as "1.2" are not file names.
function looksLikePath(text: string, brands: readonly string[]): boolean {
    // Check for relative paths starting with ./ or ../
    // Examples: "./config.json", "../src/main.ts"
    if (/^\.{1,2}\//.test(text)) return true;
    // Check for a folder whose name starts with a dot
    // Examples: ".obsidian/plugins", "Edit the .git/config file"
    if (/(?:^|[\s'"(])\.[\w-]+\//.test(text)) return true;
    // Check for words ending in a file extension
    // Examples: "src/main.ts", "C:\\Users\\file.txt", "/home/user/doc.pdf", "file.txt", "obsidian.md"
    for (const m of text.matchAll(/\.([a-z0-9]{1,4})(?=['"\s]|$)/gi)) {
        const dot = m.index;
        // "1.2", "v2.0.1", "$1.99": digits on both sides of the dot
        if (/^[0-9]+$/.test(m[1]) && /[0-9]/.test(text[dot - 1] ?? "")) continue;
        const wordStart = Math.max(...[" ", "\t", "\n", "'", "\"", "("].map((c) => text.lastIndexOf(c, dot))) + 1;
        const word = text.slice(wordStart, dot + m[0].length).toLowerCase();
        if (brands.some((brand) => brand.toLowerCase() === word)) continue;
        return true;
    }
    return false;
}

// Determines if a string should be skipped from sentence case validation
export function isSkippableString(text: string, brands: readonly string[] = DEFAULT_BRANDS): boolean {
    if (!text) return true;
    // Inline code or HTML tags
    // Examples: "Use `npm install`", "<b>Bold text</b>", "</div>"
    if (text.includes("`") || /<\/?[a-z][^>]*>/i.test(text)) return true;
    // Template placeholders
    // Examples: "Hello ${name}", "Welcome {user}", "File %s saved", "%1$s items"
    if (/(\$\{[^}]+\}|\{[^}]+\}|%\d*\$?s|%s)/.test(text)) return true;
    // File paths
    if (looksLikePath(text, brands)) return true;
    // Keyboard shortcuts
    // Examples: "Ctrl+S", "Cmd + A", "Alt+Tab", "⌘+C", "Shift + Enter"
    if (/(Ctrl|Cmd|Alt|Shift|Option|⌘|⌥|⌃|⇧)\s*\+\s*[A-Za-z]/.test(text)) return true;
    // Version numbers
    // Examples: "v1.2.3", "2.0.0", "1.0-beta", "3_2_1"
    if (/^v?\d+(?:[._-]\d+)+$/.test(text)) return true;
    // All-caps identifiers
    // Examples: "API_KEY", "MAX_SIZE", "HTTP_200"
    if (/^[A-Z0-9_]+$/.test(text)) return true;
    return false;
}

// The casing an acronym is written in: as listed for one in mixed case, such
// as "OAuth", and all caps otherwise
function acronymCasing(acronym: string): string {
    return /[a-z]/.test(acronym) && /[A-Z]/.test(acronym) ? acronym : acronym.toUpperCase();
}

// Normalizes and prepares options with defaults for sentence case evaluation
function normalizeOptions(options?: EvaluatorOptions) {
    const brands = (options?.brands ?? DEFAULT_BRANDS).slice().sort((a, b) => b.length - a.length);
    const ambiguousBrands = new Set(DEFAULT_AMBIGUOUS_BRANDS);
    // Acronyms in upper case, mapped to the casing they are written in
    const acronyms = new Map((options?.acronyms ?? DEFAULT_ACRONYMS).map((s) => [s.toUpperCase(), acronymCasing(s)]));
    const caseAgnosticAcronyms = new Set(DEFAULT_CASE_AGNOSTIC_ACRONYMS);
    const ignoreWords = new Set((options?.ignoreWords ?? []).map((s) => s));
    const ignoreRegex = (options?.ignoreRegex ?? []).map((p) => new RegExp(p));
    const mode: Mode = options?.mode ?? "loose";
    const enforceCamelCaseLower = options?.enforceCamelCaseLower === true;
    return { brands, ambiguousBrands, acronyms, caseAgnosticAcronyms, ignoreWords, ignoreRegex, mode, enforceCamelCaseLower } as const;
}

// Tests if text matches any of the ignore regex patterns
function shouldIgnoreByRegex(text: string, regexes: readonly RegExp[]): boolean {
    for (const regex of regexes) {
        regex.lastIndex = 0;
        const matches = regex.test(text);
        regex.lastIndex = 0;
        if (matches) {
            return true;
        }
    }
    return false;
}

interface BrandMatch {
    start: number;
    end: number;
    canonical: string;
}

// Finds all occurrences of a brand name (case-insensitive) and records their
// ranges and canonical casing. A brand that is also an ordinary word, such as
// "Windows", is not one where it is written as that word, in lower case.
function collectBrandMatches(sentence: string, brands: readonly string[], ambiguousBrands: ReadonlySet<string>): BrandMatch[] {
    const matches: BrandMatch[] = [];
    for (const brand of brands) {
        const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(brand)})(?=$|[^A-Za-z0-9])`, "gi");
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(sentence))) {
            if (ambiguousBrands.has(brand) && m[2] === brand.toLowerCase()) continue;
            const start = m.index + m[1].length;
            const end = start + brand.length;
            if (matches.some((existing) => !(end <= existing.start || start >= existing.end))) {
                continue;
            }
            matches.push({ start, end, canonical: brand });
        }
    }
    matches.sort((a, b) => a.start - b.start);
    return matches;
}

// Merges overlapping or adjacent character ranges into single ranges
function mergeRanges(ranges: number[][]): number[][] {
    if (ranges.length === 0) return [];
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
    const merged: number[][] = [sorted[0].slice()];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const cur = sorted[i];
        if (cur[0] <= last[1]) {
            last[1] = Math.max(last[1], cur[1]);
        } else {
            merged.push(cur.slice());
        }
    }
    return merged;
}

// Checks if a character index falls within any of the given ranges
function rangeContains(ranges: number[][], index: number): boolean {
    return ranges.some((r) => index >= r[0] && index < r[1]);
}

// Detects if a word uses camelCase or PascalCase naming convention
function isCamelOrPascal(word: string): boolean {
    // Has uppercase after first char and contains lowercase
    // Examples: "camelCase", "PascalCase", "myVariableName" but NOT "ALLCAPS" or "lowercase"
    return /[A-Z]/.test(word.slice(1)) && /[a-z]/.test(word);
}

// Replaces characters in an array at a specific position with a replacement string
function writeToken(chars: string[], start: number, replacement: string, length: number) {
    for (let i = 0; i < length; i++) {
        chars[start + i] = replacement[i] ?? chars[start + i];
    }
}

// Moment-style date and time format tokens, as in "YYYY-MM-DD" or "HH:mm".
const DATE_FORMAT_TOKEN = "(?:YYYY|YY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|HH|H|hh|h|mm|ss|SSS|A|a)";
// The tokens a format joined by spaces or commas may hold, as in "MMM D, YYYY".
// "A" and "a" are left out: only a time format before them makes them a token.
const SPACED_DATE_FORMAT_TOKEN = "(?:YYYY|YY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|HH|H|hh|h|mm|ss|SSS)";
// The tokens that are never an English word, one of which such a format needs,
// so that "Do D" is text and "Do MMM" a format
const STRONG_DATE_FORMAT_TOKEN = "(?:YYYY|YY|MMMM|MMM|MM|DD|dddd|ddd|HH|hh|mm|ss|SSS)";
// What joins the tokens of a format: a dash, slash, dot, colon or underscore,
// or a space after an optional comma
const DATE_FORMAT_SEPARATOR = "(?:[-/.:_]|,?\\s)";

// Text whose casing is data, not prose, so it is never re-cased: URLs, and two
// or more date format tokens joined by separators. Each pattern is global.
const PROTECTED_PATTERNS: readonly RegExp[] = [
    // Examples: "https://obsidian.md/help", "obsidian://open?vault=Notes"
    /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi,
    // Examples: "www.example.com/API"
    /\bwww\.\S+/gi,
    // Examples: "YYYY-MM-DD", "DD/MM/YYYY", "HH:mm:ss"
    new RegExp(
        `(?<![A-Za-z0-9])${DATE_FORMAT_TOKEN}(?:[-/.:_]${DATE_FORMAT_TOKEN})+(?![A-Za-z0-9])`,
        "g",
    ),
    // A time format with an AM/PM token after a space, which a lone "A" is not
    // Examples: "hh:mm A", "h:mm a", "HH:mm:ss A"
    new RegExp(
        `(?<![A-Za-z0-9])(?:HH|H|hh|h)(?:[:.]${DATE_FORMAT_TOKEN})+ ?[Aa](?![A-Za-z0-9])`,
        "g",
    ),
    // Tokens joined by spaces or commas, one of them a token that is never a word
    // Examples: "MMM D, YYYY", "DD MMM YYYY", "dddd, MMMM Do", "YYYY-MM-DD HH:mm"
    new RegExp(
        `(?<![A-Za-z0-9])(?:(?:${SPACED_DATE_FORMAT_TOKEN}${DATE_FORMAT_SEPARATOR})+${STRONG_DATE_FORMAT_TOKEN}` +
            `|${STRONG_DATE_FORMAT_TOKEN}(?=${DATE_FORMAT_SEPARATOR}${SPACED_DATE_FORMAT_TOKEN}))` +
            `(?:${DATE_FORMAT_SEPARATOR}${SPACED_DATE_FORMAT_TOKEN})*(?![A-Za-z0-9])`,
        "g",
    ),
];

// Finds the character ranges of text that must keep its casing
function collectProtectedRanges(sentence: string): number[][] {
    const ranges: number[][] = [];
    for (const pattern of PROTECTED_PATTERNS) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(sentence))) {
            ranges.push([m.index, m.index + m[0].length]);
        }
    }
    return mergeRanges(ranges);
}

// Checks if the range [start, end) overlaps any of the given ranges
function rangeOverlaps(ranges: number[][], start: number, end: number): boolean {
    return ranges.some((r) => start < r[1] && end > r[0]);
}

// Cases one part of a hyphenated word: acronyms upper, all-caps case-agnostic
// acronyms and brands as written, anything else lower
function caseHyphenPart(part: string, opts: ReturnType<typeof normalizeOptions>): string {
    const partUpper = part.toUpperCase();
    const acronym = opts.acronyms.get(partUpper);
    if (acronym !== undefined) return acronym;
    if (opts.caseAgnosticAcronyms.has(partUpper) && part === partUpper) return part;
    if (opts.brands.includes(part)) return part;
    return part.toLowerCase();
}

// Emoji, with the skin tones, joiners, variation selectors and keycaps that
// build them, and flags. Unlike \p{Emoji}, it leaves out the digits, so a
// number before the first word is text, as in "2 files selected".
const EMOJI_RE = /[0-9#*]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F]/gu;

// What may come before a first word that keeps the case it is written in:
// punctuation, a bullet, an arrow or quotes ("- ", "• ", "→ ", "[", "\"", "..."),
// with no letter or digit, or a list number ("1)")
const LEADING_MARKER_RE = /^(?:[^\p{L}\p{N}]+|\d{1,3}[.)])$/u;

// The end of a label in brackets or parentheses that opens the text, as in
// "[Beta] Feature" or "(Beta) Sync": the index of the word after it, which
// keeps the case it is written in, or -1. A bracket that closes the text, as
// in "(Open settings)", is not a label.
function leadingLabelEnd(sentence: string): number {
    const m = /^[^\p{L}\p{N}]*?[[(][^[\]()]*[A-Za-z0-9][^[\]()]*[\])]\s+(?=[A-Za-z0-9])/u.exec(sentence);
    return m ? m[0].length : -1;
}

// Applies sentence case transformation to a single sentence. With
// `firstWordAnyCase`, the first word keeps the case it is written in, as after
// a colon.
function transformSentence(sentence: string, opts: ReturnType<typeof normalizeOptions>, firstWordAnyCase: boolean): string {
    // URLs and format strings keep their casing, brand names inside them included
    const protectedRanges = collectProtectedRanges(sentence);
    // Find all brand occurrences to preserve their casing
    const brandMatches = collectBrandMatches(sentence, opts.brands, opts.ambiguousBrands)
        .filter((match) => !rangeOverlaps(protectedRanges, match.start, match.end));
    const brandRanges = mergeRanges(brandMatches.map((match) => [match.start, match.end]));
    const labelEnd = leadingLabelEnd(sentence);

    const chars = sentence.split("");

    // Capitalize first letter of sentence unless it's in a brand, or preceded by punctuation that allows any case
    let firstAlpha = -1;
    for (let i = 0; i < chars.length; i++) {
        if (isAlpha(chars[i])) {
            firstAlpha = i;
            break;
        }
    }
    if (
        firstAlpha >= 0 &&
        !rangeContains(brandRanges, firstAlpha) &&
        !rangeContains(protectedRanges, firstAlpha) &&
        !firstWordAnyCase
    ) {
        // Find the token containing firstAlpha
        const tokenRe = /[A-Za-z0-9][A-Za-z0-9.\-]*/g;
        let tokenStart = firstAlpha;
        let tokenEnd = firstAlpha + 1;
        let tm: RegExpExecArray | null;
        while ((tm = tokenRe.exec(sentence))) {
            const s = tm.index;
            const e = s + tm[0].length;
            if (firstAlpha >= s && firstAlpha < e) {
                tokenStart = s;
                tokenEnd = e;
                break;
            }
        }

        const firstToken = sentence.slice(tokenStart, tokenEnd);
        const upperToken = firstToken.toUpperCase();
        // Emoji and "(" before the first word are not text
        const leadingContent = sentence.slice(0, firstAlpha)
            .replace(EMOJI_RE, '')
            .replaceAll('(', '')
            .trim();
        const firstPart = firstToken.split("-")[0];
        const firstPartUpper = firstPart.toUpperCase();
        const acronym = opts.acronyms.get(upperToken);
        if (acronym !== undefined) {
            writeToken(chars, tokenStart, acronym, firstToken.length);
        } else if (
            firstToken.includes("-") &&
            (opts.acronyms.has(firstPartUpper) ||
                (opts.caseAgnosticAcronyms.has(firstPartUpper) && firstPart === firstPartUpper))
        ) {
            // "API-based", "REST-based": the opening acronym keeps its caps and
            // the other parts are cased like any hyphenated word
            const cased = firstToken.split("-").map((part) => caseHyphenPart(part, opts)).join("-");
            writeToken(chars, tokenStart, cased, firstToken.length);
        } else if (opts.caseAgnosticAcronyms.has(upperToken) && firstToken === upperToken) {
            // An all-caps "REST" opening the sentence stays as written
        } else if (!opts.enforceCamelCaseLower && opts.mode === "loose" && isCamelOrPascal(firstToken)) {
            // Preserve camelCase/PascalCase tokens when loose mode allows it
        } else if (/^[0-9]/.test(firstToken)) {
            // "1st", "3D", "10x": a word that starts with a number has no
            // first letter to capitalize, so its letters stay as written
        } else if (tokenStart === labelEnd || LEADING_MARKER_RE.test(leadingContent)) {
            // A first word after a label, punctuation, a bullet or quotes, as in
            // "[Beta] Feature", "- Item" or "\"Open\" settings", keeps its case
        } else if (leadingContent) {
            // Text before the first word, such as a number in "2 files
            // selected" or the "50%" of "50% complete", makes it a later word
            for (let j = tokenStart; j < tokenEnd; j++) {
                chars[j] = firstToken[j - tokenStart].toLowerCase();
            }
        } else {
            chars[firstAlpha] = chars[firstAlpha].toUpperCase();
            for (let j = firstAlpha + 1; j < tokenEnd; j++) {
                chars[j] = chars[j].toLowerCase();
            }
        }
    }

    // Process remaining tokens
    const tokenRe = /[A-Za-z0-9][A-Za-z0-9.\-]*/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(sentence))) {
        const start = m.index;
        const token = m[0];
        const end = start + token.length;

        // Skip if token overlaps brand
        if (brandMatches.some((match) => !(end <= match.start || start >= match.end))) continue;
        // Skip if token is part of a URL or format string
        if (rangeOverlaps(protectedRanges, start, end)) continue;

        // Skip first token if it's the first alpha token (already handled above)
        if (firstAlpha >= 0 && start <= firstAlpha && firstAlpha < end) continue;

        const upperToken = token.toUpperCase();
        const acronym = opts.acronyms.get(upperToken);
        if (acronym !== undefined) {
            writeToken(chars, start, acronym, token.length);
            continue;
        }
        // An acronym that is also a word keeps all caps when written that way
        if (opts.caseAgnosticAcronyms.has(upperToken) && token === upperToken) continue;
        // "3D", "4K", "1st": a word that starts with a number keeps its letters
        if (/^[0-9]/.test(token)) continue;
        // The first word after a label, as in "[Beta] Feature", keeps its case
        if (start === labelEnd) continue;

        const dottedMatch = token.match(/^([A-Za-z](?:\.[A-Za-z])+)(\.)?$/);
        if (dottedMatch) {
            const base = dottedMatch[1];
            const trailingDot = dottedMatch[2] ?? "";
            const parts = base.split(".");
            const allUpper = parts.every((part) => part === part.toUpperCase());
            if (allUpper) {
                const canonical = parts.map((part) => part.toUpperCase()).join(".") + trailingDot;
                writeToken(chars, start, canonical, token.length);
                continue;
            }
        }

        // Ignore configured words
        if (opts.ignoreWords.has(token)) continue;

        const hasHyphen = token.includes("-");
        // Handle hyphenated words
        if (hasHyphen) {
            const newToken = token.split("-").map((part) => caseHyphenPart(part, opts)).join("-");
            if (newToken !== token) {
                for (let i = 0; i < token.length; i++) {
                    chars[start + i] = newToken[i] ?? chars[start + i];
                }
            }
            continue;
        }

        // Check if token should be preserved
        if (opts.brands.includes(token)) continue;
        // In loose mode, preserve CamelCase unless enforceCamelCaseLower is set
        if (!opts.enforceCamelCaseLower && opts.mode === "loose" && isCamelOrPascal(token)) continue;

        // Lowercase the token
        const newToken = token.toLowerCase();
        if (newToken !== token) {
            for (let i = 0; i < token.length; i++) {
                chars[start + i] = newToken[i] ?? chars[start + i];
            }
        }
    }

    // Restore canonical brand casing
    for (const match of brandMatches) {
        writeToken(chars, match.start, match.canonical, match.canonical.length);
    }

    return chars.join("");
}

// Text that ends in an abbreviation whose dot does not end the sentence, as
// "Choose a folder, e.g" does in "Choose a folder, e.g. notes"
const ABBREVIATION_RE = /(?:^|[^A-Za-z0-9.])(?:e\.g|eg|i\.e|ie|etc|vs|cf|approx|incl|esp|viz|a\.k\.a|aka|w\.r\.t|resp|no)$/i;

// Generates a sentence case suggestion for text using normalized options
function sentenceCaseSuggestionWithOptions(
    text: string,
    opts: ReturnType<typeof normalizeOptions>,
): string {
    if (!text.trim()) return text;
    if (shouldIgnoreByRegex(text, opts.ignoreRegex)) return text;

    interface Segment {
        core: string;
        punct: string;
        whitespace: string;
    }

    const segments: Segment[] = [];
    let lastIndex = 0;
    const delimiterRe = /([.?!:;]+)(\s+|$)/g;
    let match: RegExpExecArray | null;
    while ((match = delimiterRe.exec(text))) {
        const punctStart = match.index;
        const punct = match[1];
        const whitespace = match[2] ?? "";
        const core = text.slice(lastIndex, punctStart);
        segments.push({ core, punct, whitespace });
        lastIndex = delimiterRe.lastIndex;
    }

    if (lastIndex < text.length) {
        const remainder = text.slice(lastIndex);
        const trailingWhitespaceMatch = remainder.match(/\s+$/);
        const whitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
        const core = whitespace ? remainder.slice(0, -whitespace.length) : remainder;
        segments.push({ core, punct: "", whitespace });
    }

    const transformed = segments
        .map(({ core, punct, whitespace }, index) => {
            const previous = segments[index - 1];
            // After a colon or a semicolon, or the dot of an abbreviation
            // such as "e.g.", the next word may take either case
            const firstWordAnyCase = previous !== undefined && (
                previous.punct === ":" ||
                previous.punct === ";" ||
                (previous.punct === "." && ABBREVIATION_RE.test(previous.core))
            );
            const out = transformSentence(core, opts, firstWordAnyCase);
            return out + punct + whitespace;
        })
        .join("");

    return transformed;
}

// Generates a sentence case suggestion for text
export function sentenceCaseSuggestion(text: string, options?: EvaluatorOptions): string {
    const opts = normalizeOptions(options);
    return sentenceCaseSuggestionWithOptions(text, opts);
}

// Evaluates if text follows sentence case rules and provides a suggestion if not
export function evaluateSentenceCase(text: string, options?: EvaluatorOptions): EvaluationResult {
    const opts = normalizeOptions(options);
    if (isSkippableString(text, opts.brands)) return { ok: true };
    if (shouldIgnoreByRegex(text, opts.ignoreRegex)) return { ok: true };
    const suggestion = sentenceCaseSuggestionWithOptions(text, opts);
    return { ok: suggestion === text, suggestion: suggestion === text ? undefined : suggestion };
}
