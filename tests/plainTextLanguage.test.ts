import assert from "node:assert";
import { Linter, type Rule } from "eslint";
import {
    PlainTextLanguage,
    type PlainTextDocumentNode,
    type PlainTextLanguageOptions,
    type PlainTextLineNode,
} from "../lib/plainTextLanguage.js";

const languageContext = { languageOptions: {} };

function fileOf(text: string) {
    return { path: "LICENSE", physicalPath: "LICENSE", body: text, bom: false };
}

function parse(text: string): PlainTextDocumentNode {
    const result = PlainTextLanguage.parse(fileOf(text), languageContext);
    assert.ok(result.ok);
    return result.ast;
}

function locOf(node: { loc: PlainTextLineNode["loc"] }): string {
    const { start, end } = node.loc;
    return `${start.line}:${start.column}-${end.line}:${end.column}`;
}

// One entry per Line node: its text, its range, and its loc as
// "startLine:startColumn-endLine:endColumn".
function linesOf(text: string) {
    return parse(text).lines.map(line => ({
        value: line.value,
        range: line.range,
        loc: locOf(line),
    }));
}

describe("plain-text language", () => {
    describe("parse", () => {
        it("exposes each line with its range and loc", () => {
            assert.deepStrictEqual(linesOf("MIT License\n\nCopyright (c) 2025 Jane\n"), [
                { value: "MIT License", range: [0, 11], loc: "1:0-1:11" },
                { value: "", range: [12, 12], loc: "2:0-2:0" },
                { value: "Copyright (c) 2025 Jane", range: [13, 36], loc: "3:0-3:23" },
                { value: "", range: [37, 37], loc: "4:0-4:0" },
            ]);
        });

        it("spans the whole text with the Document", () => {
            const document = parse("MIT License\n\nCopyright (c) 2025 Jane\n");
            assert.deepStrictEqual(document.range, [0, 37]);
            assert.strictEqual(locOf(document), "1:0-4:0");
        });

        it("splits on CRLF without keeping the CR", () => {
            assert.deepStrictEqual(linesOf("a\r\nb\r\n"), [
                { value: "a", range: [0, 1], loc: "1:0-1:1" },
                { value: "b", range: [3, 4], loc: "2:0-2:1" },
                { value: "", range: [6, 6], loc: "3:0-3:0" },
            ]);
        });

        it("splits on a lone CR", () => {
            assert.deepStrictEqual(linesOf("a\rb\r"), [
                { value: "a", range: [0, 1], loc: "1:0-1:1" },
                { value: "b", range: [2, 3], loc: "2:0-2:1" },
                { value: "", range: [4, 4], loc: "3:0-3:0" },
            ]);
        });

        it("splits on mixed line endings", () => {
            assert.deepStrictEqual(linesOf("a\r\nb\rc\nd"), [
                { value: "a", range: [0, 1], loc: "1:0-1:1" },
                { value: "b", range: [3, 4], loc: "2:0-2:1" },
                { value: "c", range: [5, 6], loc: "3:0-3:1" },
                { value: "d", range: [7, 8], loc: "4:0-4:1" },
            ]);
        });

        it("counts LF followed by CR as two line endings", () => {
            assert.deepStrictEqual(linesOf("a\n\rb"), [
                { value: "a", range: [0, 1], loc: "1:0-1:1" },
                { value: "", range: [2, 2], loc: "2:0-2:0" },
                { value: "b", range: [3, 4], loc: "3:0-3:1" },
            ]);
        });

        it("gives an empty file one empty line", () => {
            const document = parse("");
            assert.deepStrictEqual(linesOf(""), [
                { value: "", range: [0, 0], loc: "1:0-1:0" },
            ]);
            assert.deepStrictEqual(document.range, [0, 0]);
            assert.strictEqual(locOf(document), "1:0-1:0");
        });

        it("ends the Document at the last line when there is no trailing newline", () => {
            const document = parse("a\nbc");
            assert.deepStrictEqual(linesOf("a\nbc"), [
                { value: "a", range: [0, 1], loc: "1:0-1:1" },
                { value: "bc", range: [2, 4], loc: "2:0-2:2" },
            ]);
            assert.deepStrictEqual(document.range, [0, 4]);
            assert.strictEqual(locOf(document), "1:0-2:2");
        });

        it("gives every line a range that slices out exactly its text", () => {
            for (const text of ["a\r\nb\rc\nd", "\r\n\r\n", "x\n\ry\r", "  Copyright\t(c)  \n"]) {
                for (const line of parse(text).lines) {
                    assert.strictEqual(text.slice(...line.range), line.value, JSON.stringify(text));
                }
            }
        });
    });

    describe("source code", () => {
        function sourceCodeOf(text: string) {
            return PlainTextLanguage.createSourceCode(
                fileOf(text),
                { ok: true, ast: parse(text) },
                languageContext,
            );
        }

        it("splits lines the same way as the Line nodes", () => {
            const text = "a\r\nb\rc\nd\n";
            assert.deepStrictEqual(
                sourceCodeOf(text).lines,
                parse(text).lines.map(line => line.value),
            );
        });

        it("has no comments", () => {
            assert.deepStrictEqual(sourceCodeOf("/* eslint-disable */\n").getAllComments(), []);
        });

        it("gives each line the document as its parent, and the document none", () => {
            const sourceCode = sourceCodeOf("a\nb");
            for (const line of sourceCode.ast.lines) {
                assert.strictEqual(sourceCode.getParent(line), sourceCode.ast);
            }
            assert.strictEqual(sourceCode.getParent(sourceCode.ast), undefined);
        });

        // [node, phase (1 enter, 2 exit), number of visitor arguments]
        function stepsOf(sourceCode: ReturnType<typeof sourceCodeOf>) {
            return [...sourceCode.traverse()].map(step => {
                const { target, phase, args } = step as unknown as {
                    target: PlainTextDocumentNode | PlainTextLineNode;
                    phase: number;
                    args: unknown[];
                };
                return [target.type === "Line" ? target.value : target.type, phase, args.length];
            });
        }

        it("enters the document, enters and exits each line, then exits the document", () => {
            assert.deepStrictEqual(stepsOf(sourceCodeOf("a\nb")), [
                ["Document", 1, 1],
                ["a", 1, 2],
                ["a", 2, 2],
                ["b", 1, 2],
                ["b", 2, 2],
                ["Document", 2, 1],
            ]);
        });

        it("traverses the same way every time", () => {
            const sourceCode = sourceCodeOf("a\nb");
            const first = stepsOf(sourceCode);
            assert.deepStrictEqual(stepsOf(sourceCode), first);
        });
    });

    // ESLint, not the language, strips a byte order mark and turns the
    // 0-based columns into the 1-based ones users see, so check both end to end.
    describe("through ESLint", () => {
        const reportLines = {
            meta: { type: "problem", schema: [] },
            create(context: Rule.RuleContext) {
                return {
                    Line(node: PlainTextLineNode) {
                        context.report({ loc: node.loc, message: JSON.stringify(node.value) });
                    },
                };
            },
        } as unknown as Rule.RuleModule;

        function lint(text: string) {
            return new Linter().verify(text, [{
                files: ["LICENSE"],
                plugins: {
                    obsidianmd: {
                        languages: { "plain-text": PlainTextLanguage },
                        rules: { "report-lines": reportLines },
                    },
                },
                language: "obsidianmd/plain-text",
                rules: { "obsidianmd/report-lines": "error" },
            }], "LICENSE").map(m => [m.line, m.column, m.endLine, m.endColumn, m.message]);
        }

        it("reports 1-based lines and columns", () => {
            assert.deepStrictEqual(lint("a\r\nbc"), [
                [1, 1, 1, 2, '"a"'],
                [2, 1, 2, 3, '"bc"'],
            ]);
        });

        it("calls Line visitors with the document as parent, between Document and Document:exit", () => {
            const calls: string[] = [];
            const recordVisits = {
                meta: { type: "problem", schema: [] },
                create() {
                    return {
                        Document: () => calls.push("Document"),
                        Line: (node: PlainTextLineNode, parent: PlainTextDocumentNode) =>
                            calls.push(`Line ${node.value} ${parent.type}`),
                        "Line:exit": (node: PlainTextLineNode) => calls.push(`Line:exit ${node.value}`),
                        "Document:exit": () => calls.push("Document:exit"),
                    };
                },
            } as unknown as Rule.RuleModule;
            new Linter().verify("a\nb", [{
                files: ["LICENSE"],
                plugins: {
                    obsidianmd: {
                        languages: { "plain-text": PlainTextLanguage },
                        rules: { "record-visits": recordVisits },
                    },
                },
                language: "obsidianmd/plain-text",
                rules: { "obsidianmd/record-visits": "error" },
            }], "LICENSE");
            assert.deepStrictEqual(calls, [
                "Document",
                "Line a Document",
                "Line:exit a",
                "Line b Document",
                "Line:exit b",
                "Document:exit",
            ]);
        });

        it("does not include a byte order mark in the first line", () => {
            assert.deepStrictEqual(lint("﻿Copyright (c) 2025 Jane"), [
                [1, 1, 1, 24, '"Copyright (c) 2025 Jane"'],
            ]);
        });
    });

    describe("validateLanguageOptions", () => {
        it("accepts no options", () => {
            assert.doesNotThrow(() => PlainTextLanguage.validateLanguageOptions({}));
        });

        // A config object without `files` puts its languageOptions on LICENSE
        // too. They belong to another language, so they must not be an error.
        it("ignores options meant for another language", () => {
            const options = {
                parser: {},
                parserOptions: { projectService: true },
                globals: { activeDocument: "readonly" },
                ecmaVersion: 2022,
                sourceType: "module",
            } as unknown as PlainTextLanguageOptions;
            assert.doesNotThrow(() => PlainTextLanguage.validateLanguageOptions(options));
        });
    });
});
