import { AST_NODE_TYPES, ASTUtils, ESLintUtils, TSESLint } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { gt, lt, valid } from "semver";
import ts from "typescript";
import { getManifest } from "../manifest.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

type Options = [{ minAppVersion?: string }?];

type QualifiedName = string;
type Version = string;
type SinceVersion = Version;
type SinceMap = Map<QualifiedName, SinceVersion>;

interface SinceMapCache {
    obsidianPackageVersion: Version;
    entries: [QualifiedName, SinceVersion][];
}

let cachedSinceMap: SinceMap | undefined;
let cachedDtsPath: string | undefined;

export default ruleCreator<Options, "apiNotAvailable">({
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow usage of Obsidian APIs not available in the plugin's minimum app version",
            url: docsUrl("no-unsupported-api"),
            requiresTypeChecking: true,
        },
        schema: [
            {
                type: "object",
                properties: {
                    minAppVersion: {
                        type: "string",
                        description:
                            "The minimum app version to check against. Defaults to manifest.json minAppVersion.",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            apiNotAvailable:
                "'{{qualifiedName}}' requires Obsidian v{{sinceVersion}}, but minAppVersion is {{minAppVersion}}.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const resolvedVersion =
            options.minAppVersion ?? getManifest()?.minAppVersion;
        if (!resolvedVersion) {
            return {};
        }
        const minAppVersion: string = String(resolvedVersion);
        // A minAppVersion semver cannot parse would make `gt` throw and abort the
        // whole lint run. "0.15" means 0.15.0, as a dotted version with missing
        // parts read as 0; anything else proves nothing about the app, so it is
        // checked as 0.0.0 and every versioned API is reported rather than the
        // check being skipped.
        const minVersion = toVersion(minAppVersion) ?? "0.0.0";

        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        const dtsPath = findObsidianDtsPath(services.program);
        if (!dtsPath) {
            return {};
        }
        const sinceMap = buildSinceMap(dtsPath);
        const reported = new WeakSet<TSESTree.Node>();

        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                if (node.property.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                if (node.computed) {
                    return;
                }

                const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node, symbol);
            },

            NewExpression(node: TSESTree.NewExpression) {
                if (node.callee.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node, symbol);
            },

            ClassDeclaration: checkSuperClass,
            // `const Suggest = class extends AbstractInputSuggest<string> {}`
            ClassExpression: checkSuperClass,

            CallExpression(node: TSESTree.CallExpression) {
                if (node.callee.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node.callee, symbol);
            },
        };

        // A superclass named by an identifier. One named by a property access,
        // such as `obsidian.AbstractInputSuggest`, is a MemberExpression,
        // checked above.
        function checkSuperClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): void {
            if (!node.superClass) {
                return;
            }
            if (node.superClass.type !== AST_NODE_TYPES.Identifier) {
                return;
            }
            const tsNode = services.esTreeNodeToTSNodeMap.get(node.superClass);
            const symbol = checker.getSymbolAtLocation(tsNode);
            checkSymbol(node.superClass, symbol);
        }

        function resolveSymbol(symbol: ts.Symbol): ts.Symbol {
            if (symbol.flags & ts.SymbolFlags.Alias) {
                return checker.getAliasedSymbol(symbol);
            }
            return symbol;
        }

        function checkSymbol(
            node: TSESTree.Node,
            symbol?: ts.Symbol
        ): void {
            if (!symbol || reported.has(node)) {
                return;
            }
            const resolved = resolveSymbol(symbol);
            const declarations = resolved.getDeclarations();
            if (!declarations?.length) {
                return;
            }

            for (const decl of declarations) {
                if (!isObsidianDeclaration(decl) || isPluginSuppliedMember(decl)) {
                    continue;
                }

                const parentName = getParentTypeName(decl);
                const symbolName = resolved.getName();
                const qualifiedName = parentName
                    ? `${parentName}.${symbolName}`
                    : symbolName;
                const sinceTag = sinceMap.get(qualifiedName);
                const sinceVersion = sinceTag && toVersion(sinceTag);

                if (!sinceVersion) {
                    continue;
                }
                if (gt(sinceVersion, minVersion)) {
                    if (isGuardedByRequireApiVersion(node, sinceVersion)) {
                        return;
                    }
                    reported.add(node);
                    context.report({
                        node,
                        messageId: "apiNotAvailable",
                        data: {
                            qualifiedName,
                            sinceVersion,
                            minAppVersion,
                        },
                    });
                    return;
                }
            }
        }

        // The guard version a `requireApiVersion(...)` argument proves: a string
        // literal, or any expression whose type is a string literal or a union of
        // them (a const, an `as const` member, an enum, a template built from
        // constants, a choice between versions). A union proves only its lowest
        // member. let, string and anything that is not a full x.y.z prove nothing.
        function getArgumentVersion(
            expr: TSESTree.CallExpressionArgument,
        ): Version | undefined {
            if (expr.type === AST_NODE_TYPES.Literal) {
                return typeof expr.value === "string" ? valid(expr.value) ?? undefined : undefined;
            }
            if (expr.type === AST_NODE_TYPES.SpreadElement) {
                return undefined;
            }
            const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(expr));
            let lowest: Version | undefined;
            for (const member of type.isUnion() ? type.types : [type]) {
                const version = member.isStringLiteral() ? valid(member.value) : null;
                if (!version) {
                    return undefined;
                }
                if (!lowest || lt(version, lowest)) {
                    lowest = version;
                }
            }
            return lowest;
        }

        // The `x` of `const x = <init>`, with nothing else able to rebind it.
        function getConstInitializer(id: TSESTree.Identifier): TSESTree.Expression | undefined {
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(id), id);
            if (!variable || variable.defs.length !== 1) {
                return undefined;
            }
            const def = variable.defs[0];
            if (
                def.type !== TSESLint.Scope.DefinitionType.Variable ||
                def.parent.kind !== "const" ||
                def.node.id.type !== AST_NODE_TYPES.Identifier
            ) {
                return undefined;
            }
            return def.node.init ?? undefined;
        }

        // The API version proven available when `expr` evaluates truthy (or
        // falsy). `seen` holds the const initializers being resolved, so a
        // cycle such as `const a = b, b = a` stops instead of recursing forever.
        function versionWhen(
            expr: TSESTree.Expression,
            truthy: boolean,
            seen: Set<TSESTree.Node> = new Set(),
        ): Version | undefined {
            switch (expr.type) {
                case AST_NODE_TYPES.CallExpression:
                    if (
                        truthy &&
                        expr.callee.type === AST_NODE_TYPES.Identifier &&
                        expr.callee.name === "requireApiVersion" &&
                        expr.arguments.length >= 1
                    ) {
                        return getArgumentVersion(expr.arguments[0]);
                    }
                    return undefined;
                case AST_NODE_TYPES.UnaryExpression:
                    return expr.operator === "!"
                        ? versionWhen(expr.argument, !truthy, seen)
                        : undefined;
                case AST_NODE_TYPES.LogicalExpression: {
                    if (expr.operator === "??") {
                        return undefined;
                    }
                    const left = versionWhen(expr.left, truthy, seen);
                    const right = versionWhen(expr.right, truthy, seen);
                    // `a && b` truthy and `a || b` falsy mean both sides held, so
                    // either side's version is proven; otherwise only one side
                    // held, so both must prove a version and the lower one wins.
                    return (expr.operator === "&&") === truthy
                        ? higherOf(left, right)
                        : lowerOfBoth(left, right);
                }
                case AST_NODE_TYPES.Identifier: {
                    const init = getConstInitializer(expr);
                    if (!init || seen.has(init)) {
                        return undefined;
                    }
                    seen.add(init);
                    const version = versionWhen(init, truthy, seen);
                    seen.delete(init);
                    return version;
                }
                default:
                    return undefined;
            }
        }

        // Whether `node` can only run once a `requireApiVersion` check has proven
        // `sinceVersion` available.
        function isGuardedByRequireApiVersion(node: TSESTree.Node, sinceVersion: string): boolean {
            const covers = (version: Version | undefined) =>
                version !== undefined && !gt(sinceVersion, version);

            let current: TSESTree.Node | undefined = node.parent;
            let prevChild: TSESTree.Node = node;

            while (current) {
                if (
                    current.type === AST_NODE_TYPES.IfStatement ||
                    current.type === AST_NODE_TYPES.ConditionalExpression
                ) {
                    if (prevChild === current.consequent && covers(versionWhen(current.test, true))) {
                        return true;
                    }
                    if (prevChild === current.alternate && covers(versionWhen(current.test, false))) {
                        return true;
                    }
                } else if (current.type === AST_NODE_TYPES.LogicalExpression) {
                    if (
                        prevChild === current.right &&
                        current.operator !== "??" &&
                        covers(versionWhen(current.left, current.operator === "&&"))
                    ) {
                        return true;
                    }
                } else if (
                    !isHoistedFunction(prevChild) &&
                    getEarlierStatements(current, prevChild).some((statement) =>
                        covers(versionAfterEarlyExit(statement)),
                    )
                ) {
                    return true;
                }
                prevChild = current;
                current = current.parent;
            }
            return false;
        }

        // The version proven for the statements after `if (test) <exit>`, which
        // only run when `test` was falsy (or truthy, for `if (test) {} else <exit>`).
        function versionAfterEarlyExit(statement: TSESTree.Statement): Version | undefined {
            if (statement.type !== AST_NODE_TYPES.IfStatement) {
                return undefined;
            }
            const consequentExits = alwaysExits(statement.consequent);
            const alternateExits = statement.alternate !== null && alwaysExits(statement.alternate);
            if (consequentExits && !alternateExits) {
                return versionWhen(statement.test, false);
            }
            if (alternateExits && !consequentExits) {
                return versionWhen(statement.test, true);
            }
            return undefined;
        }
    }
});

// A version semver can compare: as written when valid, a bare "x" or "x.y" with
// the missing parts read as 0 ("0.15" is 0.15.0), else undefined. Nothing looser:
// semver's coerce would read "x99.0.0" as 99.0.0, and a manifest could then
// switch the rule off with a minAppVersion Obsidian does not read that way.
function toVersion(raw: string): Version | undefined {
    const version = valid(raw);
    if (version) {
        return version;
    }
    const partial = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
    return partial ? `${Number(partial[1])}.${Number(partial[2] ?? 0)}.0` : undefined;
}

function higherOf(a: Version | undefined, b: Version | undefined): Version | undefined {
    if (!a || !b) {
        return a ?? b;
    }
    return gt(a, b) ? a : b;
}

function lowerOfBoth(a: Version | undefined, b: Version | undefined): Version | undefined {
    if (!a || !b) {
        return undefined;
    }
    return lt(a, b) ? a : b;
}

// Function declarations are hoisted, so one written after an early exit can
// still be called before it.
function isHoistedFunction(node: TSESTree.Node): boolean {
    if (
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportDefaultDeclaration
    ) {
        return node.declaration?.type === AST_NODE_TYPES.FunctionDeclaration;
    }
    return node.type === AST_NODE_TYPES.FunctionDeclaration;
}

// The statements that run before `child` in a statement list it belongs to.
function getEarlierStatements(container: TSESTree.Node, child: TSESTree.Node): TSESTree.Statement[] {
    let statements: TSESTree.Node[];
    switch (container.type) {
        case AST_NODE_TYPES.BlockStatement:
        case AST_NODE_TYPES.StaticBlock:
        case AST_NODE_TYPES.Program:
            statements = container.body;
            break;
        case AST_NODE_TYPES.SwitchCase:
            statements = container.consequent;
            break;
        default:
            return [];
    }
    const index = statements.indexOf(child);
    return index > 0 ? (statements.slice(0, index) as TSESTree.Statement[]) : [];
}

// Whether running `statement` always leaves the statement list it sits in:
// `return`, `throw`, a `break`/`continue` with a target, or a block holding one
// of those at its top level. An exit only inside a nested `if` or loop does not
// count.
function alwaysExits(statement: TSESTree.Statement): boolean {
    switch (statement.type) {
        case AST_NODE_TYPES.ReturnStatement:
        case AST_NODE_TYPES.ThrowStatement:
            return true;
        case AST_NODE_TYPES.BreakStatement:
        case AST_NODE_TYPES.ContinueStatement:
            return hasJumpTarget(statement);
        case AST_NODE_TYPES.BlockStatement:
            return statement.body.some(alwaysExits);
        default:
            return false;
    }
}

// Whether a `break`/`continue` has a target in its own function. Without one the
// code is not valid JavaScript, and the jump proves nothing.
function hasJumpTarget(statement: TSESTree.BreakStatement | TSESTree.ContinueStatement): boolean {
    const isContinue = statement.type === AST_NODE_TYPES.ContinueStatement;
    for (let node = statement.parent; node; node = node.parent) {
        switch (node.type) {
            case AST_NODE_TYPES.FunctionDeclaration:
            case AST_NODE_TYPES.FunctionExpression:
            case AST_NODE_TYPES.ArrowFunctionExpression:
            case AST_NODE_TYPES.StaticBlock:
            case AST_NODE_TYPES.Program:
                return false;
            case AST_NODE_TYPES.LabeledStatement:
                if (statement.label && node.label.name === statement.label.name) {
                    return !isContinue || isLoop(node.body);
                }
                break;
            case AST_NODE_TYPES.SwitchStatement:
                if (!statement.label && !isContinue) {
                    return true;
                }
                break;
            default:
                if (!statement.label && isLoop(node)) {
                    return true;
                }
        }
    }
    return false;
}

function isLoop(node: TSESTree.Node): boolean {
    return (
        node.type === AST_NODE_TYPES.ForStatement ||
        node.type === AST_NODE_TYPES.ForInStatement ||
        node.type === AST_NODE_TYPES.ForOfStatement ||
        node.type === AST_NODE_TYPES.WhileStatement ||
        node.type === AST_NODE_TYPES.DoWhileStatement
    );
}

function buildSinceMap(dtsPath: string): SinceMap {
    if (cachedSinceMap && cachedDtsPath === dtsPath) {
        return cachedSinceMap;
    }

    const obsidianVersion = getObsidianVersion(dtsPath);

    if (obsidianVersion) {
        const cached = loadCachedSinceMap(dtsPath, obsidianVersion);
        if (cached) {
            cachedSinceMap = cached;
            cachedDtsPath = dtsPath;
            return cached;
        }
    }

    const sinceMap: SinceMap = new Map();
    const content = readFileSync(dtsPath, "utf8");
    const sourceFile = ts.createSourceFile(
        "obsidian.d.ts",
        content,
        ts.ScriptTarget.Latest,
        true,
    );

    visit(sourceFile);

    if (obsidianVersion) {
        saveSinceMapCache(dtsPath, obsidianVersion, sinceMap);
    }

    cachedSinceMap = sinceMap;
    cachedDtsPath = dtsPath;
    return sinceMap;

    function visit(node: ts.Node): void {
        const sinceVersion = getSinceTag(node);

        if (ts.isClassDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
            visitMembers(node.name.text, node.members);
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
            visitMembers(node.name.text, node.members);
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        } else if (ts.isEnumDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        } else if (ts.isModuleDeclaration(node)) {
            ts.forEachChild(node, visit);
        } else if (ts.isModuleBlock(node)) {
            ts.forEachChild(node, visit);
        }

        if (ts.isSourceFile(node)) {
            ts.forEachChild(node, visit);
        }
    }

    function visitMembers(
        parentName: string,
        members: ts.NodeArray<ts.Node>,
    ): void {
        for (const member of members) {
            const sinceVersion = getSinceTag(member);
            if (!sinceVersion) {
                continue;
            }
            let memberName: string | undefined;
            if (
                ts.isMethodDeclaration(member) ||
                ts.isPropertyDeclaration(member) ||
                ts.isMethodSignature(member) ||
                ts.isPropertySignature(member) ||
                ts.isGetAccessorDeclaration(member) ||
                ts.isSetAccessorDeclaration(member)
            ) {
                memberName = member.name?.getText(sourceFile);
            }
            if (memberName) {
                sinceMap.set(`${parentName}.${memberName}`, sinceVersion);
            }
        }
    }
}

function findObsidianDtsPath(program: ts.Program): string | undefined {
    for (const sourceFile of program.getSourceFiles()) {
        const normalized = sourceFile.fileName.replace(/\\/g, "/");
        if (normalized.includes("/obsidian/obsidian.d.ts")) {
            return sourceFile.fileName;
        }
    }
    return undefined;
}

function getCachePath(dtsPath: string): string {
    const cacheDir = join(dirname(dtsPath), "..", ".cache", "eslint-plugin-obsidianmd");
    return join(cacheDir, "since-map.json");
}

function getObsidianVersion(dtsPath: string): string | undefined {
    try {
        const pkgPath = join(dirname(dtsPath), "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
        return pkg.version;
    } catch {
        return undefined;
    }
}

function getParentTypeName(declaration: ts.Declaration): string | undefined {
    const parent = declaration.parent;
    if (ts.isClassDeclaration(parent) && parent.name) {
        return parent.name.text;
    }
    if (ts.isInterfaceDeclaration(parent) && parent.name) {
        return parent.name.text;
    }
    return undefined;
}

function getSinceTag(node: ts.Node): string | undefined {
    const tags = ts.getJSDocTags(node);
    for (const tag of tags) {
        if (tag.tagName.text === "since" && typeof tag.comment === "string") {
            return tag.comment.trim();
        }
    }
    return undefined;
}

// Obsidian's settings-definition API (1.13) is data the plugin supplies:
// getSettingDefinitions() returns objects the plugin builds, so a member of one
// of those types is the plugin's own value and exists on every Obsidian
// version, for instance when a plugin renders its definitions itself on an
// older one. The family is every interface and type alias reachable from
// getSettingDefinitions()'s return type through properties, unions, arrays,
// `extends` and type arguments. Classes stop the walk (SettingPage, Setting and
// the like are runtime exports), and so do function types, whose parameters
// and results are values Obsidian provides to the plugin's callbacks, and the
// `declare global` augmentations of DOM types.
const pluginSuppliedTypes = new WeakMap<ts.SourceFile, Set<string>>();

function isPluginSuppliedMember(declaration: ts.Declaration): boolean {
    const parent = declaration.parent;
    if (!ts.isInterfaceDeclaration(parent)) {
        return false;
    }
    return getPluginSuppliedTypes(declaration.getSourceFile()).has(parent.name.text);
}

export function getPluginSuppliedTypes(sourceFile: ts.SourceFile): Set<string> {
    const cached = pluginSuppliedTypes.get(sourceFile);
    if (cached) {
        return cached;
    }

    const declared = new Map<string, ts.Node[]>();
    const roots: ts.TypeNode[] = [];
    const collect = (statements: ts.NodeArray<ts.Statement>): void => {
        for (const statement of statements) {
            if (ts.isModuleDeclaration(statement)) {
                // `declare global { ... }` augments DOM types such as Node and
                // DocumentFragment at runtime; those are never plugin-supplied.
                const isGlobal = (statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0;
                if (!isGlobal && statement.body && ts.isModuleBlock(statement.body)) {
                    collect(statement.body.statements);
                }
                continue;
            }
            if (
                (ts.isInterfaceDeclaration(statement) ||
                    ts.isTypeAliasDeclaration(statement) ||
                    ts.isClassDeclaration(statement)) &&
                statement.name
            ) {
                const list = declared.get(statement.name.text) ?? [];
                list.push(statement);
                declared.set(statement.name.text, list);
            }
            if (ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) {
                for (const member of statement.members) {
                    if (
                        (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) &&
                        member.name.getText(sourceFile) === "getSettingDefinitions" &&
                        member.type
                    ) {
                        roots.push(member.type);
                    }
                }
            }
        }
    };
    collect(sourceFile.statements);

    const family = new Set<string>();
    const visitType = (node: ts.TypeNode | undefined): void => {
        if (!node || ts.isFunctionTypeNode(node) || ts.isConstructorTypeNode(node)) {
            return;
        }
        if (ts.isTypeReferenceNode(node)) {
            const name = ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.right.text;
            visitName(name);
            node.typeArguments?.forEach(visitType);
        } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
            node.types.forEach(visitType);
        } else if (ts.isArrayTypeNode(node)) {
            visitType(node.elementType);
        } else if (ts.isParenthesizedTypeNode(node) || ts.isTypeOperatorNode(node)) {
            visitType(node.type);
        } else if (ts.isTypeLiteralNode(node)) {
            visitMembers(node.members);
        }
    };
    const visitMembers = (members: ts.NodeArray<ts.TypeElement>): void => {
        for (const member of members) {
            if (ts.isPropertySignature(member)) {
                visitType(member.type);
            }
        }
    };
    const visitName = (name: string): void => {
        const declarations = declared.get(name);
        if (!declarations || family.has(name) || declarations.some((d) => ts.isClassDeclaration(d))) {
            return;
        }
        family.add(name);
        for (const declaration of declarations) {
            if (ts.isTypeAliasDeclaration(declaration)) {
                visitType(declaration.type);
            } else if (ts.isInterfaceDeclaration(declaration)) {
                for (const clause of declaration.heritageClauses ?? []) {
                    for (const heritage of clause.types) {
                        if (ts.isIdentifier(heritage.expression)) {
                            visitName(heritage.expression.text);
                        }
                        heritage.typeArguments?.forEach(visitType);
                    }
                }
                visitMembers(declaration.members);
            }
        }
    };
    roots.forEach(visitType);

    pluginSuppliedTypes.set(sourceFile, family);
    return family;
}

function isObsidianDeclaration(declaration: ts.Declaration): boolean {
    const fileName = declaration.getSourceFile().fileName.replace(/\\/g, "/");
    return fileName.includes("/obsidian/obsidian.d.ts");
}

function loadCachedSinceMap(dtsPath: string, obsidianVersion: string): SinceMap | undefined {
    try {
        const cachePath = getCachePath(dtsPath);
        const raw = readFileSync(cachePath, "utf8");
        const cache = JSON.parse(raw) as SinceMapCache;
        if (cache.obsidianPackageVersion === obsidianVersion) {
            return new Map(cache.entries);
        }

        return undefined;
    } catch {
        return undefined;
    }
}

function saveSinceMapCache(dtsPath: string, obsidianVersion: string, sinceMap: SinceMap): void {
    try {
        const cachePath = getCachePath(dtsPath);
        mkdirSync(dirname(cachePath), { recursive: true });
        const cache: SinceMapCache = {
            obsidianPackageVersion: obsidianVersion,
            entries: [...sinceMap.entries()],
        };
        writeFileSync(cachePath, JSON.stringify(cache), "utf8");
    } catch {
        // Non-critical. Caching is best-effort
    }
}
