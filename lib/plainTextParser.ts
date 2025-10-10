import { AST_NODE_TYPES, AST_TOKEN_TYPES } from "@typescript-eslint/types";
import type { Parser } from "@typescript-eslint/utils/ts-eslint";

/**
 * A plain text parser for ESLint.
 * It treats each line as a separate token of type `Line`.
 * This allows us to lint plain text files like LICENSE files.
 */
export const PlainTextParser: Parser.ParserModule = {
    meta: {
        name: "plain-text-parser",
        version: "1.0.0",
    },
    parseForESLint(text: string): Parser.ParseResult {
        const lines = text.split("\n");

        const tokens: Parser.ParseResult["ast"]["tokens"] = [];

        let index = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            tokens.push({
                // Line is originally supposed to represent a multi-line comment,
                // but we use it to represent a line of text here. The identifier fits best.
                type: AST_TOKEN_TYPES.Line,
                value: line,
                range: [index, index + line.length],
                loc: {
                    start: { line: i + 1, column: 0 },
                    end: { line: i + 1, column: line.length },
                },
            });
            index += line.length + 1; // +1 for the newline character
        }

        return {
            ast: {
                type: AST_NODE_TYPES.Program,
                sourceType: "script",
                range: [0, text.length],
                loc: {
                    start: tokens[0]?.loc.start ?? { line: 1, column: 0 },
                    end: tokens[tokens.length - 1].loc.end ?? { line: 1, column: 0 },
                },
                body: [],
                comments: [],
                tokens: tokens,
            },
        };
    }
}