import { TSESLint, TSESTree } from "@typescript-eslint/utils";
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
  debugLabel: string;
  formatReplacement?: (node: TSESTree.Node, suggestion: string) => string | null;
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

// Creates a reporter function for sentence case violations with caching and auto-fix support
export function createSentenceCaseReporter<MessageId extends string>(
  params: SentenceCaseReporterParams<MessageId>,
): SentenceCaseReport {
  const cache = new Map<string, EvaluationResult>();

  return (node, value) => {
    const cached = cache.get(value);
    const result = cached ?? evaluateSentenceCase(value, params.evaluatorOptions);
    if (!cached) {
      cache.set(value, result);
    }
    if (result.ok || !result.suggestion) {
      return;
    }

    const suggestion = result.suggestion;

    if (process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE === "1") {
      console.debug(params.debugLabel, { value, suggestion });
    }

    if (!params.allowAutoFix) {
      params.context.report({
        node,
        messageId: params.messageId,
      });
      return;
    }

    params.context.report({
      node,
      messageId: params.messageId,
      fix(fixer: TSESLint.RuleFixer) {
        const customReplacement = params.formatReplacement?.(node, suggestion);
        const replacement = customReplacement ?? JSON.stringify(suggestion);
        return fixer.replaceText(node, replacement);
      },
    });
  };
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

// Checks if a file path matches the pattern for English locale files
export function isEnglishLocalePath(
  filePath: string,
  extensions: readonly string[],
): boolean {
  const normalized = normalizePath(filePath);
  const normalizedExtensions = extensions.map((ext) => ext.replace(/^\./, ""));
  const extensionPattern = normalizedExtensions.map(escapeRegExp).join("|");
  const regex = new RegExp(
    `(?:^|/)en(?:[._-][^/]+)?(?:/.*)?\\.(?:${extensionPattern})$`,
    "i",
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

// Unwraps TypeScript type assertions and non-null assertions to get the underlying expression
export function unwrapExpression(
  node: TSESTree.Node | null | undefined,
): TSESTree.Expression | null {
  let current: TSESTree.Node | null | undefined = node;
  while (current) {
    if (
      current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSNonNullExpression"
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

// Detects if text appears to be a file path
function looksLikePath(text: string): boolean {
  // Check for relative paths starting with ./ or ../
  // Examples: "./config.json", "../src/main.ts"
  if (/^\.{1,2}\//.test(text)) return true;
  // Check for paths with slashes and file extensions
  // Examples: "src/main.ts", "C:\\Users\\file.txt", "/home/user/doc.pdf"
  if (/[\\/]/.test(text) && /\.[a-z0-9]{1,4}(\b|$)/i.test(text)) return true;
  return false;
}

// Determines if a string should be skipped from sentence case validation
export function isSkippableString(text: string): boolean {
  if (!text) return true;
  // Inline code or HTML tags
  // Examples: "Use `npm install`", "<b>Bold text</b>", "</div>"
  if (text.includes("`") || /<\/?[a-z][^>]*>/i.test(text)) return true;
  // Template placeholders
  // Examples: "Hello ${name}", "Welcome {user}", "File %s saved", "%1$s items"
  if (/(\$\{[^}]+\}|\{[^}]+\}|%\d*\$?s|%s)/.test(text)) return true;
  // File paths
  if (looksLikePath(text)) return true;
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

// Normalizes and prepares options with defaults for sentence case evaluation
function normalizeOptions(options?: EvaluatorOptions) {
  const brands = (options?.brands ?? DEFAULT_BRANDS).slice().sort((a, b) => b.length - a.length);
  const acronyms = new Set((options?.acronyms ?? DEFAULT_ACRONYMS).map((s) => s.toUpperCase()));
  const ignoreWords = new Set((options?.ignoreWords ?? []).map((s) => s));
  const ignoreRegex = (options?.ignoreRegex ?? []).map((p) => new RegExp(p));
  const mode: Mode = options?.mode ?? "loose";
  const enforceCamelCaseLower = options?.enforceCamelCaseLower === true;
  return { brands, acronyms, ignoreWords, ignoreRegex, mode, enforceCamelCaseLower } as const;
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

// Finds all occurrences of a brand name (case-insensitive) and records their ranges and canonical casing
function collectBrandMatches(sentence: string, brands: readonly string[]): BrandMatch[] {
  const matches: BrandMatch[] = [];
  for (const brand of brands) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(brand)})(?=$|[^A-Za-z0-9])`, "gi");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(sentence))) {
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

// Applies sentence case transformation to a single sentence
function transformSentence(sentence: string, opts: ReturnType<typeof normalizeOptions>): string {
  // Find all brand occurrences to preserve their casing
  const brandMatches = collectBrandMatches(sentence, opts.brands);
  const brandRanges = mergeRanges(brandMatches.map((match) => [match.start, match.end]));

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
    const hasLeadingContent = sentence.slice(0, firstAlpha).trim().length > 0;
    if (opts.acronyms.has(upperToken)) {
      writeToken(chars, tokenStart, upperToken, firstToken.length);
    } else if (!opts.enforceCamelCaseLower && opts.mode === "loose" && isCamelOrPascal(firstToken)) {
      // Preserve camelCase/PascalCase tokens when loose mode allows it
    } else if (hasLeadingContent) {
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

    // Skip first token if it's the first alpha token (already handled above)
    if (firstAlpha >= 0 && start <= firstAlpha && firstAlpha < end) continue;

    const upperToken = token.toUpperCase();
    if (opts.acronyms.has(upperToken)) {
      writeToken(chars, start, upperToken, token.length);
      continue;
    }

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

  // Restore canonical brand casing
  for (const match of brandMatches) {
    writeToken(chars, match.start, match.canonical, match.canonical.length);
  }

  return chars.join("");
}

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
  const delimiterRe = /([.?!]+)(\s+|$)/g;
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
    .map(({ core, punct, whitespace }) => {
      const out = transformSentence(core, opts);
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
  if (isSkippableString(text)) return { ok: true };
  const opts = normalizeOptions(options);
  if (shouldIgnoreByRegex(text, opts.ignoreRegex)) return { ok: true };
  const suggestion = sentenceCaseSuggestionWithOptions(text, opts);
  return { ok: suggestion === text, suggestion: suggestion === text ? undefined : suggestion };
}
