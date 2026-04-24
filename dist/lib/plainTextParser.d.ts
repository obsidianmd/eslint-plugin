import type { Parser } from "@typescript-eslint/utils/ts-eslint";
/**
 * A plain text parser for ESLint.
 * It treats each line as a separate token of type `Line`.
 * This allows us to lint plain text files like LICENSE files.
 */
export declare const PlainTextParser: Parser.ParserModule;
