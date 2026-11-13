import ts from "typescript";

// How no-unsupported-api and scripts/obsidian-overload-history.ts tell the
// overloads of an Obsidian method apart, the same way in every published
// obsidian.d.ts.

export function getSinceTag(node: ts.Node): string | undefined {
    const tags = ts.getJSDocTags(node);
    for (const tag of tags) {
        if (tag.tagName.text === "since" && typeof tag.comment === "string") {
            return tag.comment.trim();
        }
    }
    return undefined;
}

// The parameters a caller passes, without a `this: …` one.
function getParameters(declaration: ts.SignatureDeclaration): ts.ParameterDeclaration[] {
    return declaration.parameters.filter(
        (parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === "this"),
    );
}

// The string literal each parameter typed as one takes, by position: `'files-menu'`
// in `on(name: 'files-menu', callback: …)`. Undefined for other parameters.
export function getLiteralParameters(declaration: ts.SignatureDeclaration): (string | undefined)[] {
    return getParameters(declaration).map((parameter) =>
        parameter.type && ts.isLiteralTypeNode(parameter.type) && ts.isStringLiteral(parameter.type.literal)
            ? parameter.type.literal.text
            : undefined,
    );
}

// What identifies an overload across versions of the typings. One that takes a
// string literal, as each `Workspace.on()` overload takes its event name, is
// that literal at its position: `(0: "files-menu")`, whatever the callback's
// type was then. Any other is its parameter types, written without whitespace
// or comments, with `?` after an optional one and `...` before a rest one:
// `(WorkspaceLeaf, PaneType|boolean, SplitDirection?)`.
export function getOverloadKey(declaration: ts.SignatureDeclaration): string {
    const literals = getLiteralParameters(declaration).flatMap((literal, index) =>
        literal === undefined ? [] : [`${index}: ${JSON.stringify(literal)}`],
    );
    if (literals.length > 0) {
        return `(${literals.join(", ")})`;
    }
    const sourceFile = declaration.getSourceFile();
    const types = getParameters(declaration).map(
        (parameter) =>
            (parameter.dotDotDotToken ? "..." : "") +
            (parameter.type ? getTypeText(parameter.type, sourceFile) : "any") +
            (parameter.questionToken || parameter.initializer ? "?" : ""),
    );
    return `(${types.join(", ")})`;
}

// An overload's return type, written the same way: `Promise<WorkspaceLeaf>`.
export function getReturnTypeText(declaration: ts.SignatureDeclaration): string {
    return declaration.type ? getTypeText(declaration.type, declaration.getSourceFile()) : "any";
}

// A type as its tokens, so whitespace, line breaks, comments and the quotes
// around a string literal do not count.
function getTypeText(node: ts.TypeNode, sourceFile: ts.SourceFile): string {
    const start = node.getStart(sourceFile);
    const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        sourceFile.text,
        undefined,
        start,
        node.end - start,
    );
    let text = "";
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
        text += token === ts.SyntaxKind.StringLiteral ? JSON.stringify(scanner.getTokenValue()) : scanner.getTokenText();
    }
    return text;
}
