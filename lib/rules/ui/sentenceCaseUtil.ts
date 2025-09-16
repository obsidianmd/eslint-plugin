import { DEFAULT_BRANDS } from "./brands.js";
import { DEFAULT_ACRONYMS } from "./acronyms.js";

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAlpha(ch: string): boolean {
  return /[A-Za-z]/.test(ch);
}

function looksLikePath(text: string): boolean {
  // Check for relative paths or files with extensions
  if (/^\.{1,2}\//.test(text)) return true;
  if (/[\\/]/.test(text) && /\.[a-z0-9]{1,4}(\b|$)/i.test(text)) return true;
  return false;
}

export function isSkippableString(text: string): boolean {
  if (!text) return true;
  // Inline code or HTML tags
  if (text.includes("`") || /<\/?[a-z][^>]*>/i.test(text)) return true;
  // Template placeholders (${}, {}, %s)
  if (/(\$\{[^}]+\}|\{[^}]+\}|%\d*\$?s|%s)/.test(text)) return true;
  // File paths
  if (looksLikePath(text)) return true;
  // Keyboard shortcuts
  if (/(Ctrl|Cmd|Alt|Shift|Option|⌘|⌥|⌃|⇧)\s*\+\s*[A-Za-z]/.test(text)) return true;
  // Version numbers
  if (/^v?\d+(?:[._-]\d+)+$/.test(text)) return true;
  // All-caps identifiers
  if (/^[A-Z0-9_]+$/.test(text)) return true;
  return false;
}

function normalizeOptions(options?: EvaluatorOptions) {
  const brands = (options?.brands ?? DEFAULT_BRANDS).slice().sort((a, b) => b.length - a.length);
  const acronyms = new Set((options?.acronyms ?? DEFAULT_ACRONYMS).map((s) => s.toUpperCase()));
  const ignoreWords = new Set((options?.ignoreWords ?? []).map((s) => s));
  const ignoreRegex = (options?.ignoreRegex ?? []).map((p) => new RegExp(p));
  const mode: Mode = options?.mode ?? "loose";
  const enforceCamelCaseLower = options?.enforceCamelCaseLower === true;
  return { brands, acronyms, ignoreWords, ignoreRegex, mode, enforceCamelCaseLower } as const;
}

function shouldIgnoreByRegex(text: string, regexes: readonly RegExp[]): boolean {
  for (const regex of regexes) {
    regex.lastIndex = 0;
    if (regex.test(text)) {
      regex.lastIndex = 0;
      return true;
    }
    regex.lastIndex = 0;
  }
  return false;
}

function indexRangesOfBrand(sentence: string, brand: string): number[][] {
  const ranges: number[][] = [];
  const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(brand)})(?=$|[^A-Za-z0-9])`, "g");
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(sentence))) {
    const start = m.index + m[1].length;
    const end = start + brand.length;
    ranges.push([start, end]);
  }
  return ranges;
}

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

function rangeContains(ranges: number[][], index: number): boolean {
  return ranges.some((r) => index >= r[0] && index < r[1]);
}

function isCamelOrPascal(word: string): boolean {
  // Has uppercase after first char and contains lowercase
  return /[A-Z]/.test(word.slice(1)) && /[a-z]/.test(word);
}

function writeToken(chars: string[], start: number, replacement: string, length: number) {
  for (let i = 0; i < length; i++) {
    chars[start + i] = replacement[i] ?? chars[start + i];
  }
}

function transformSentence(sentence: string, opts: ReturnType<typeof normalizeOptions>): string {
  // Find all brand occurrences to preserve their casing
  let brandRanges: number[][] = [];
  for (const brand of opts.brands) {
    brandRanges.push(...indexRangesOfBrand(sentence, brand));
  }
  brandRanges = mergeRanges(brandRanges);

  const chars = sentence.split("");

  // Capitalize first letter of sentence unless it's in a brand
  let firstAlpha = -1;
  for (let i = 0; i < chars.length; i++) {
    if (isAlpha(chars[i])) {
      firstAlpha = i;
      break;
    }
  }
  if (firstAlpha >= 0 && !rangeContains(brandRanges, firstAlpha)) {
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
    if (opts.acronyms.has(upperToken)) {
      writeToken(chars, tokenStart, upperToken, firstToken.length);
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
    if (brandRanges.some((r) => !(end <= r[0] || start >= r[1]))) continue;

    // Skip first token if it's the first alpha token (already handled above)
    if (firstAlpha >= 0 && start <= firstAlpha && firstAlpha < end) continue;

    const upperToken = token.toUpperCase();
    if (opts.acronyms.has(upperToken)) {
      writeToken(chars, start, upperToken, token.length);
      continue;
    }

    // Ignore configured words
    if (opts.ignoreWords.has(token)) continue;

    const hasHyphen = token.includes("-");
    // Handle hyphenated words
    if (hasHyphen) {
      const hyphenParts = token.split("-");
      const newParts = hyphenParts.map((part) => {
        const partUpper = part.toUpperCase();
        if (opts.acronyms.has(partUpper)) return partUpper;
        // Preserve brand casing
        if (opts.brands.includes(part)) return part;
        // Lowercase other parts
        return part.toLowerCase();
      });
      const newToken = newParts.join("-");
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

  return chars.join("");
}

function sentenceCaseSuggestionWithOptions(
  text: string,
  opts: ReturnType<typeof normalizeOptions>,
): string {
  if (!text.trim()) return text;
  if (shouldIgnoreByRegex(text, opts.ignoreRegex)) return text;

  // Split text into sentences
  const parts: string[] = [];
  let lastIndex = 0;
  const re = /([.?!]+)\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const segment = text.slice(lastIndex, m.index + m[1].length);
    parts.push(segment);
    lastIndex = m.index + m[0].length; // include trailing space(s)
  }
  parts.push(text.slice(lastIndex));

  const transformed = parts
    .map((seg) => {
      // Break into core sentence and trailing punctuation
      const match = seg.match(/^(.*?)([.?!]+)?$/);
      const core = match ? match[1] : seg;
      const punct = match && match[2] ? match[2] : "";
      const out = transformSentence(core, opts);
      return out + punct + (seg.endsWith(" ") ? " " : "");
    })
    .join("");

  return transformed;
}

export function sentenceCaseSuggestion(text: string, options?: EvaluatorOptions): string {
  const opts = normalizeOptions(options);
  return sentenceCaseSuggestionWithOptions(text, opts);
}

export function evaluateSentenceCase(text: string, options?: EvaluatorOptions): EvaluationResult {
  if (isSkippableString(text)) return { ok: true };
  const opts = normalizeOptions(options);
  if (shouldIgnoreByRegex(text, opts.ignoreRegex)) return { ok: true };
  const suggestion = sentenceCaseSuggestionWithOptions(text, opts);
  return { ok: suggestion === text, suggestion: suggestion === text ? undefined : suggestion };
}
