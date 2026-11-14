import type ts from "typescript";

// The chaining `then(cb: (x: this) => any): this` of Obsidian's BaseComponent and
// Setting: a `then` whose every declaration is in the obsidian package's obsidian.d.ts.
// Merged or overriding declarations elsewhere disqualify it.
export function isObsidianChainingThen(symbol: ts.Symbol): boolean {
    if (symbol.getName() !== "then") {
        return false;
    }
    return declaredOnlyInObsidian(symbol);
}

// Every declaration of `symbol` is in the obsidian package's obsidian.d.ts.
export function declaredOnlyInObsidian(symbol: ts.Symbol): boolean {
    const declarations = symbol.getDeclarations();
    return declarations !== undefined && declarations.length > 0 && declarations.every(isInObsidian);
}

// The obsidian package's obsidian.d.ts declares `symbol`, which a
// `declare module "obsidian"` augmentation may merge into.
export function declaredInObsidian(symbol: ts.Symbol): boolean {
    return symbol.getDeclarations()?.some(isInObsidian) ?? false;
}

function isInObsidian(declaration: ts.Declaration): boolean {
    return /(^|\/)node_modules\/obsidian\/obsidian\.d\.ts$/.test(
        declaration.getSourceFile().fileName.replace(/\\/g, "/"),
    );
}
