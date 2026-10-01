import type {
    File,
    Language,
    LanguageContext,
    OkParseResult,
    ParseResult,
    RuleVisitor,
    SourceLocation,
    SourceRange,
    TraversalStep,
} from "@eslint/core";
import { TextSourceCodeBase, VisitNodeStep } from "@eslint/plugin-kit";

/** A single line of a plain text file. */
export interface PlainTextLineNode {
    type: "Line";
    /** The text of the line, without its terminator. */
    value: string;
    loc: SourceLocation;
    range: SourceRange;
}

/** The root node of a plain text file. */
export interface PlainTextDocumentNode {
    type: "Document";
    lines: PlainTextLineNode[];
    loc: SourceLocation;
    range: SourceRange;
}

export type PlainTextNode = PlainTextDocumentNode | PlainTextLineNode;

/** Plain text has nothing to configure. */
export type PlainTextLanguageOptions = Record<string, never>;

export interface PlainTextRuleVisitor extends RuleVisitor {
    Document?(node: PlainTextDocumentNode): void;
    Line?(node: PlainTextLineNode, parent?: PlainTextDocumentNode): void;
    "Document:exit"?(node: PlainTextDocumentNode): void;
    "Line:exit"?(node: PlainTextLineNode, parent?: PlainTextDocumentNode): void;
}

const LINE_ENDING_PATTERN = /\r\n|[\r\n]/u;

export class PlainTextSourceCode extends TextSourceCodeBase<{
    LangOptions: PlainTextLanguageOptions;
    RootNode: PlainTextDocumentNode;
    SyntaxElementWithLoc: PlainTextNode;
    ConfigNode: never;
}> {
    override ast: PlainTextDocumentNode;

    #steps: TraversalStep[] | undefined;

    constructor({ text, ast }: { text: string; ast: PlainTextDocumentNode }) {
        super({ text, ast, lineEndingPattern: LINE_ENDING_PATTERN });
        this.ast = ast;
    }

    // The AST is only two levels deep, so a node's parent is the document
    // unless the node is the document itself.
    override getParent(node: PlainTextNode): PlainTextNode | undefined {
        return node.type === "Line" ? this.ast : undefined;
    }

    override traverse(): Iterable<TraversalStep> {
        // The AST does not mutate, so the steps can be cached.
        if (this.#steps) {
            return this.#steps.values();
        }

        const steps: TraversalStep[] = (this.#steps = []);

        steps.push(
            new VisitNodeStep({
                target: this.ast,
                phase: 1,
                args: [this.ast],
            }),
        );

        for (const line of this.ast.lines) {
            steps.push(
                new VisitNodeStep({ target: line, phase: 1, args: [line, this.ast] }),
                new VisitNodeStep({ target: line, phase: 2, args: [line, this.ast] }),
            );
        }

        steps.push(
            new VisitNodeStep({
                target: this.ast,
                phase: 2,
                args: [this.ast],
            }),
        );

        return steps;
    }
}

/**
 * An ESLint language that exposes each line of a text file as a `Line` node.
 *
 * This is a language rather than a parser on purpose. A parser is set through
 * `languageOptions.parser`, which ESLint merges by key, so any later config
 * object without a `files` restriction replaces it -- and a LICENSE file then
 * reaches, say, the TypeScript parser, which fails on an extensionless file.
 * A `language` is only replaced by another `language`, so the LICENSE block
 * cannot be clobbered by an unrelated `languageOptions` entry.
 */
export const PlainTextLanguage: Language<{
    LangOptions: PlainTextLanguageOptions;
    Code: PlainTextSourceCode;
    RootNode: PlainTextDocumentNode;
    Node: PlainTextNode;
}> = {
    fileType: "text",
    lineStart: 1,
    // 0 so that reported columns stay 1-based, as they are for source files.
    columnStart: 0,
    nodeTypeKey: "type",
    visitorKeys: {
        Document: ["lines"],
        Line: [],
    },

    // Plain text takes no options. Anything else present on languageOptions --
    // a stray `parserOptions` from a config block that does not restrict its
    // `files` -- is simply not ours to validate, and must not be an error.
    validateLanguageOptions(): void {
        // no options to validate
    },

    parse(file: File): ParseResult<PlainTextDocumentNode> {
        const text = String(file.body);
        const lines: PlainTextLineNode[] = [];

        let index = 0;
        let lineNumber = 1;
        for (const line of text.split(LINE_ENDING_PATTERN)) {
            lines.push({
                type: "Line",
                value: line,
                range: [index, index + line.length],
                loc: {
                    start: { line: lineNumber, column: 0 },
                    end: { line: lineNumber, column: line.length },
                },
            });
            // The terminator may be 1 or 2 characters, so recover the offset
            // from the source text rather than assuming "\n".
            const terminator = text.slice(index + line.length).match(/^\r\n|^[\r\n]/u);
            index += line.length + (terminator ? terminator[0].length : 0);
            lineNumber++;
        }

        return {
            ok: true,
            ast: {
                type: "Document",
                lines,
                range: [0, text.length],
                loc: {
                    start: { line: 1, column: 0 },
                    end: lines[lines.length - 1]?.loc.end ?? { line: 1, column: 0 },
                },
            },
        };
    },

    createSourceCode(
        file: File,
        parseResult: OkParseResult<PlainTextDocumentNode>,
        _context: LanguageContext<PlainTextLanguageOptions>,
    ): PlainTextSourceCode {
        return new PlainTextSourceCode({
            text: String(file.body),
            ast: parseResult.ast,
        });
    },
};
