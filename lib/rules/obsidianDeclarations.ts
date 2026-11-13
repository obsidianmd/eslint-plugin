import { createHash } from "node:crypto";
import ts from "typescript";
import { getSinceTag } from "./obsidianOverloads.js";

// How no-unsupported-api and scripts/obsidian-overload-history.ts write the
// declarations of obsidian.d.ts, the same way in every published version, so
// the rule can compare the declaration a plugin uses with the ones the older
// typings had (see obsidianDeclarationHistory.ts).
//
// A declaration's shape is its type with what does not change its meaning left
// out: whitespace, comments, JSDoc, quotes and the names of parameters, which
// are written `_0`, `_1` and so on. It is still TypeScript, so the rule can
// parse an old shape back:
// - a method or function: a function type, `(_0?:boolean)=>WorkspaceLeaf`
// - a property or accessor: its type after `:`, or `?:` for an optional one
// - a class: `class _` with its type parameters, heritage and constructors,
//   `class _ extends Component{constructor(_0:App);}`

// The declarations that have a version: each member of each class and
// interface, each function, each variable and each class, by qualified name.
export type DeclarationShapes = Map<string, { shape: string; since: string | undefined }[]>;

export function collectDeclarationShapes(sourceFile: ts.SourceFile): DeclarationShapes {
    const shapes: DeclarationShapes = new Map();
    // Some releases declare a name under another one and export it renamed:
    // `export const moment_2: typeof Moment; export { moment_2 as moment }`,
    // and `Plugin_2` the same way. A declaration counts by the exported name.
    const renamed = new Map<string, string>();
    const collectRenames = (node: ts.Node): void => {
        if (
            ts.isExportDeclaration(node) &&
            !node.moduleSpecifier &&
            node.exportClause &&
            ts.isNamedExports(node.exportClause)
        ) {
            for (const specifier of node.exportClause.elements) {
                if (specifier.propertyName) {
                    renamed.set(specifier.propertyName.text, specifier.name.text);
                }
            }
        } else if (ts.isSourceFile(node) || ts.isModuleDeclaration(node) || ts.isModuleBlock(node)) {
            ts.forEachChild(node, collectRenames);
        }
    };
    collectRenames(sourceFile);
    const exported = (name: string) => renamed.get(name) ?? name;
    const add = (name: string, node: ts.Node, shape: string | undefined) => {
        if (shape === undefined) {
            return;
        }
        const list = shapes.get(name) ?? [];
        list.push({ shape, since: getSinceTag(node) });
        shapes.set(name, list);
    };
    const visit = (node: ts.Node): void => {
        if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name) {
            const parent = exported(node.name.text);
            if (ts.isClassDeclaration(node)) {
                add(parent, node, classShape(node));
            }
            for (const member of node.members) {
                if (member.name && !ts.isComputedPropertyName(member.name)) {
                    add(`${parent}.${member.name.getText(sourceFile)}`, member, memberShape(member));
                }
            }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            add(exported(node.name.text), node, signatureShape(node));
        } else if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) {
                    add(exported(declaration.name.text), declaration, `:${typeText(declaration.type)}`);
                }
            }
        } else if (ts.isSourceFile(node) || ts.isModuleDeclaration(node) || ts.isModuleBlock(node)) {
            ts.forEachChild(node, visit);
        }
    };
    visit(sourceFile);
    return shapes;
}

// Writes a type reference its own way, as no-unsupported-api does to write a
// type alias as the type it stands for, or returns undefined to write it as it
// is. The functions below take one where the rule needs that.
export type InlineReference = (reference: ts.TypeReferenceNode) => string | undefined;

// The shape of a member of a class or interface, or undefined for one without
// a version, such as an index signature or a constructor.
export function memberShape(member: ts.Node, inline?: InlineReference): string | undefined {
    if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
        return signatureShape(member, inline);
    }
    if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
        return `${member.questionToken ? "?" : ""}:${typeText(member.type, inline)}`;
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return `:${typeText(member.type, inline)}`;
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return `:${typeText(member.parameters[0]?.type, inline)}`;
    }
    return undefined;
}

// A method or function as a function type, without a `this` parameter, which
// callers do not pass.
export function signatureShape(declaration: ts.SignatureDeclaration, inline?: InlineReference): string {
    const parameters = declaration.parameters
        .filter((parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === "this"))
        .map((parameter, index) => parameterText(parameter, index, inline));
    return `${typeParametersText(declaration.typeParameters, inline)}(${parameters.join(",")})=>${typeText(declaration.type, inline)}`;
}

export function classShape(declaration: ts.ClassDeclaration): string {
    const abstract = declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword);
    const heritage = (declaration.heritageClauses ?? []).map((clause) => normalize(clause)).join(" ");
    const constructors = declaration.members
        .filter(ts.isConstructorDeclaration)
        .map((constructor) => `constructor(${constructor.parameters.map((parameter, index) => parameterText(parameter, index)).join(",")});`);
    return `${abstract ? "abstract " : ""}class _${typeParametersText(declaration.typeParameters)}${heritage ? ` ${heritage}` : ""}{${constructors.join("")}}`;
}

function parameterText(parameter: ts.ParameterDeclaration, index: number, inline?: InlineReference): string {
    const name = ts.isIdentifier(parameter.name) && parameter.name.text === "this" ? "this" : `_${index}`;
    const optional = parameter.questionToken || parameter.initializer ? "?" : "";
    return `${parameter.dotDotDotToken ? "..." : ""}${name}${optional}:${typeText(parameter.type, inline)}`;
}

function typeParametersText(
    parameters: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
    inline?: InlineReference,
): string {
    return parameters?.length ? `<${parameters.map((parameter) => normalize(parameter, inline)).join(",")}>` : "";
}

function typeText(type: ts.TypeNode | undefined, inline?: InlineReference): string {
    return type ? normalize(type, inline) : "any";
}

// A node as its tokens, without comments and `export` or `declare`, with each
// parameter named by its position and each string literal in double quotes. A
// space separates two tokens only where they would otherwise run together, as
// in `keyof T`.
export function normalize(node: ts.Node, inline?: InlineReference): string {
    const sourceFile = node.getSourceFile();
    let text = "";
    const append = (token: string) => {
        if (/[\w$]$/.test(text) && /^[\w$]/.test(token)) {
            text += " ";
        }
        text += token;
    };
    const visit = (current: ts.Node): void => {
        if (ts.isParameter(current) && ts.isFunctionLike(current.parent)) {
            append(parameterText(current, current.parent.parameters.indexOf(current), inline));
            return;
        }
        const inlined = inline && ts.isTypeReferenceNode(current) ? inline(current) : undefined;
        if (inlined !== undefined) {
            append(inlined);
            return;
        }
        if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
            append(JSON.stringify(current.text));
            return;
        }
        const children = current.getChildren(sourceFile);
        if (children.length === 0) {
            const token = current.getText(sourceFile);
            if (token) {
                append(token);
            }
            return;
        }
        for (const child of children) {
            // `export` and `declare` say where a declaration is visible, not
            // what it means, and some releases leave them out.
            if (
                !ts.isJSDoc(child) &&
                child.kind !== ts.SyntaxKind.ExportKeyword &&
                child.kind !== ts.SyntaxKind.DeclareKeyword
            ) {
                visit(child);
            }
        }
    };
    visit(node);
    return text;
}

// The names of the types a node refers to: `PaneType` in `(_0?:PaneType|boolean)=>WorkspaceLeaf`.
export function referencedTypeNames(node: ts.Node): Set<string> {
    const names = new Set<string>();
    const visit = (current: ts.Node): void => {
        if (ts.isTypeReferenceNode(current) && ts.isIdentifier(current.typeName)) {
            names.add(current.typeName.text);
        } else if (ts.isExpressionWithTypeArguments(current) && ts.isIdentifier(current.expression)) {
            names.add(current.expression.text);
        }
        ts.forEachChild(current, visit);
    };
    visit(node);
    return names;
}

// The interfaces, type aliases and enums of obsidian.d.ts by name: the types
// whose meaning is their declaration. A class is left out, since an older
// release's class is the same class with fewer members, and so are the `declare
// global` additions to DOM types, which are not those types' declarations.
export function indexTypeDeclarations(sourceFile: ts.SourceFile): Map<string, ts.Node[]> {
    const declared = new Map<string, ts.Node[]>();
    const classes = new Set<string>();
    const collect = (statements: ts.NodeArray<ts.Statement>): void => {
        for (const statement of statements) {
            if (ts.isModuleDeclaration(statement)) {
                const isGlobal = (statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0;
                if (!isGlobal && statement.body && ts.isModuleBlock(statement.body)) {
                    collect(statement.body.statements);
                }
            } else if (ts.isClassDeclaration(statement) && statement.name) {
                classes.add(statement.name.text);
            } else if (
                (ts.isInterfaceDeclaration(statement) ||
                    ts.isTypeAliasDeclaration(statement) ||
                    ts.isEnumDeclaration(statement)) &&
                statement.name
            ) {
                const list = declared.get(statement.name.text) ?? [];
                list.push(statement);
                declared.set(statement.name.text, list);
            }
        }
    };
    collect(sourceFile.statements);
    for (const name of classes) {
        declared.delete(name);
    }
    return declared;
}

// A hash of what a type means: its declarations and those of every type they
// refer to, directly or not. Two typings give a name the same hash when the
// type and everything it is built from are written the same way.
export function typeHashes(index: Map<string, ts.Node[]>): (name: string) => string | undefined {
    const texts = new Map<string, string>();
    const references = new Map<string, string[]>();
    const textOf = (name: string): string => {
        let text = texts.get(name);
        if (text === undefined) {
            const declarations = index.get(name) ?? [];
            text = declarations.map((declaration) => normalize(declaration)).join("\n");
            texts.set(name, text);
            const referenced = new Set<string>();
            for (const declaration of declarations) {
                for (const reference of referencedTypeNames(declaration)) {
                    if (reference !== name && index.has(reference)) {
                        referenced.add(reference);
                    }
                }
            }
            references.set(name, [...referenced]);
        }
        return text;
    };
    const hashes = new Map<string, string>();
    return (name) => {
        if (!index.has(name)) {
            return undefined;
        }
        let hash = hashes.get(name);
        if (hash === undefined) {
            const reached = new Set([name]);
            for (const current of reached) {
                textOf(current);
                for (const reference of references.get(current) ?? []) {
                    reached.add(reference);
                }
            }
            const content = [...reached].sort().map((current) => `${current}=${textOf(current)}`).join("\n");
            hash = createHash("sha1").update(content).digest("hex").slice(0, 12);
            hashes.set(name, hash);
        }
        return hash;
    };
}

// A shape parsed back: the function type, type or class it writes.
export function parseShape(shape: string): ts.Node | undefined {
    const isClass = shape.startsWith("class ") || shape.startsWith("abstract class ");
    const source = isClass ? `declare ${shape}` : `type _=${shape.replace(/^\??:/, "")};`;
    const sourceFile = ts.createSourceFile("shape.d.ts", source, ts.ScriptTarget.Latest, true);
    const statement = sourceFile.statements[0];
    if (isClass) {
        return statement && ts.isClassDeclaration(statement) ? statement : undefined;
    }
    return statement && ts.isTypeAliasDeclaration(statement) ? statement.type : undefined;
}
