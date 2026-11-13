import { AST_NODE_TYPES, ASTUtils, ESLintUtils, TSESLint } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gt, lt, valid } from "semver";
import ts from "typescript";
import { getManifest } from "../manifest.js";
import { toVersion } from "../minAppVersion.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";
import {
    DECLARATION_HISTORY,
    DECLARATION_HISTORY_VERSIONS,
    TYPE_HISTORY,
    UNDATED_DECLARATIONS,
} from "./obsidianDeclarationHistory.js";
import {
    classShape,
    type InlineReference,
    indexTypeDeclarations,
    memberShape,
    normalize,
    parseShape,
    referencedTypeNames,
    signatureShape,
    typeHashes,
} from "./obsidianDeclarations.js";
import { OVERLOAD_HISTORY } from "./obsidianOverloadHistory.js";
import { getLiteralParameters, getOverloadKey, getSinceTag } from "./obsidianOverloads.js";

type Options = [{ minAppVersion?: string }?];

type QualifiedName = string;
type Version = string;
type SinceVersion = Version;
// The @since of each declaration of a name in obsidian.d.ts, by the position the
// declaration starts at (its `pos`). A method has a declaration per overload, and
// each can carry its own version; an overload without @since is listed with null.
type SinceEntry = [position: number, since: SinceVersion | null][];
type SinceMap = Map<QualifiedName, SinceEntry>;

interface SinceMapCache {
    // The shape of `entries`, so a build that changes it without a new plugin
    // version, as in development, does not read a map in the old shape.
    format?: number;
    obsidianPackageVersion: Version;
    // The version of this plugin that wrote the cache, so a release that builds
    // the map differently does not reuse a map an older one wrote.
    pluginVersion?: string;
    entries: [QualifiedName, SinceEntry][];
}

// A cache without `format` holds one version per name; 2 holds a SinceEntry.
const SINCE_MAP_FORMAT = 2;

const PLUGIN_VERSION = readPluginVersion();

// This plugin's own package.json: two levels up from lib/rules/ in the source,
// three from dist/lib/rules/ in the build.
function readPluginVersion(): string | undefined {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const candidate of [join(here, "../../package.json"), join(here, "../../../package.json")]) {
        try {
            const pkg = JSON.parse(readFileSync(candidate, "utf8")) as { name?: string; version?: string };
            if (pkg.name === "eslint-plugin-obsidianmd") {
                return pkg.version;
            }
        } catch {
            // Not there: try the next location.
        }
    }
    return undefined;
}

let cachedSinceMap: SinceMap | undefined;
let cachedDtsPath: string | undefined;

export default ruleCreator<Options, MessageId>({
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
                "'{{qualifiedName}}' requires Obsidian v{{sinceVersion}}, but minAppVersion is {{minAppVersion}}. Raise minAppVersion to {{sinceVersion}}, or guard this use with requireApiVersion(\"{{sinceVersion}}\").",
            // Below the version that has requireApiVersion() itself.
            apiNotAvailableCheck:
                "'{{qualifiedName}}' requires Obsidian v{{sinceVersion}}, but minAppVersion is {{minAppVersion}}. Raise minAppVersion to {{sinceVersion}}, or check that it exists before using it.",
            // A superclass, or a use no check of the member's existence can guard.
            apiNotAvailableRaise:
                "'{{qualifiedName}}' requires Obsidian v{{sinceVersion}}, but minAppVersion is {{minAppVersion}}. Raise minAppVersion to {{sinceVersion}}.",
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
        const history = getDeclarationHistory(dtsPath);
        // requireApiVersion() is first in the 0.13.21 typings: below that, a
        // plugin cannot call it to guard a use.
        const requireApiVersionSince = history.firstDeclared("requireApiVersion", () => true) ?? "0.13.21";
        const canRequireApiVersion =
            !gt(requireApiVersionSince, minVersion);
        const reported = new WeakSet<TSESTree.Node>();
        const declaredTypes = new WeakMap<ts.SourceFile, Map<string, ts.Type | undefined>>();
        const earlyExits = new WeakMap<TSESTree.Node, EarlyExit[]>();

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
                const call =
                    node.parent.type === AST_NODE_TYPES.CallExpression && node.parent.callee === node
                        ? node.parent
                        : undefined;
                checkSymbol(node, symbol, call);
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

            // A global or module variable without @since, such as activeDocument.
            Identifier(node: TSESTree.Identifier) {
                if (!UNDATED_VARIABLES.has(node.name) || !isValueReference(node)) {
                    return;
                }
                const symbol = checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node));
                if (symbol && resolveSymbol(symbol).getDeclarations()?.every(ts.isVariableDeclaration)) {
                    checkSymbol(node, symbol);
                }
            },

            CallExpression(node: TSESTree.CallExpression) {
                if (node.callee.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node.callee, symbol, node);
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

        // `call` is the call `node` is the callee of, if any.
        function checkSymbol(
            node: TSESTree.Node,
            symbol?: ts.Symbol,
            call?: TSESTree.CallExpression,
        ): void {
            if (!symbol || reported.has(node) || (isFeatureTest(node) && !isBareGlobal(node))) {
                return;
            }
            const resolved = resolveSymbol(symbol);
            const declarations = resolved.getDeclarations();
            if (!declarations?.length) {
                return;
            }

            // The declarations of each Obsidian member the symbol stands for:
            // one per overload for a method, and a member of each type for a
            // property of a union.
            const members = new Map<QualifiedName, ts.Declaration[]>();
            for (const decl of declarations) {
                if (!isObsidianDeclaration(decl) || isPluginSuppliedMember(decl)) {
                    continue;
                }

                const parentName = getParentTypeName(decl);
                const symbolName = resolved.getName();
                const qualifiedName = parentName
                    ? `${parentName}.${symbolName}`
                    : symbolName;
                members.set(qualifiedName, [...(members.get(qualifiedName) ?? []), decl]);
            }

            for (const [qualifiedName, overloads] of members) {
                const entry = sinceMap.get(qualifiedName);
                const required = entry
                    ? requiredVersion(qualifiedName, entry, overloads, call)
                    : undatedVersion(node, qualifiedName, declarations, overloads, call);
                let sinceVersion = required?.version;

                if (!required || !sinceVersion) {
                    continue;
                }
                if (gt(sinceVersion, minVersion)) {
                    const used = required.called ? [required.called] : overloads;
                    const declared = history.firstDeclared(qualifiedName, (shape, at) =>
                        fitsShape(shape, at, used, fittedCall(node, required.called, overloads, call)),
                    );
                    if (declared && lt(declared, sinceVersion)) {
                        sinceVersion = declared;
                    }
                }
                const oldest = DECLARATION_HISTORY_VERSIONS[0];
                if (
                    sinceVersion === oldest &&
                    entry?.some(([, value]) => {
                        const since = toSince(value);
                        return since !== null && gt(since, oldest);
                    })
                ) {
                    // Older than its @since, the member is in the oldest typings on
                    // npm, which tell only that the app had it by then, not since
                    // when. A plugin with a lower minAppVersion is not told that it
                    // needs that release.
                    continue;
                }
                if (gt(sinceVersion, minVersion)) {
                    // A check that the member exists proves enough only when
                    // existing is all the use needs: not for a call that needs a
                    // newer signature of a member older typings had.
                    const existence = history.firstDeclared(qualifiedName, () => true) ?? sinceVersion;
                    const feature = existence === sinceVersion ? featureKey(node) : undefined;
                    if (
                        (feature !== undefined && call?.optional === true && call.callee === node && !isBareGlobal(node)) ||
                        isGuardedByRequireApiVersion(node, sinceVersion, feature)
                    ) {
                        return;
                    }
                    reported.add(node);
                    context.report({
                        node,
                        messageId: isSuperClass(node)
                            ? "apiNotAvailableRaise"
                            : canRequireApiVersion
                              ? "apiNotAvailable"
                              : feature !== undefined
                                ? "apiNotAvailableCheck"
                                : "apiNotAvailableRaise",
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

        // The version a use of a declaration without @since needs: the first
        // typings from which on every release declared it in a form
        // the use fits, or else declared it at all. Only for the declarations
        // the history lists (see UNDATED_DECLARATIONS), that obsidian.d.ts
        // alone declares: a member that lib.dom or the plugin declares too,
        // such as a plugin's own `innerWidth` on a union, exists anyway. A
        // member of an interface only obsidian.d.ts declares, such as
        // DomElementInfo.placeholder, is the plugin's own option, and a write
        // to a property, such as `this.navigation = true`, works on any release.
        function undatedVersion(
            node: TSESTree.Node,
            qualifiedName: QualifiedName,
            declarations: ts.Declaration[],
            overloads: ts.Declaration[],
            call: TSESTree.CallExpression | undefined,
        ): { version: Version | undefined; called: ts.Declaration | undefined } | undefined {
            if (
                !UNDATED_NAMES.has(qualifiedName) ||
                !declarations.every(isObsidianDeclaration) ||
                !overloads.every(isCheckedUndated) ||
                isPropertyWrite(node, overloads)
            ) {
                return undefined;
            }
            const called = call ? resolvedOverload(call, overloads) : undefined;
            const used = called ? [called] : overloads;
            const version =
                history.firstDeclared(qualifiedName, (shape, at) => fitsShape(shape, at, used, fittedCall(node, called, overloads, call), true)) ??
                history.firstDeclared(qualifiedName, () => true);
            return { version, called };
        }

        // A declaration of a class, a function, a variable, or a member of a
        // class or of a lib.dom type obsidian.d.ts adds to, such as
        // HTMLElement.setCssProps or Array.unique.
        function isCheckedUndated(declaration: ts.Declaration): boolean {
            const parent = declaration.parent;
            if (ts.isClassDeclaration(parent)) {
                return true;
            }
            if (!ts.isInterfaceDeclaration(parent)) {
                return true;
            }
            const owner = checker.getSymbolAtLocation(parent.name);
            return owner?.getDeclarations()?.some((other) => !isObsidianDeclaration(other)) ?? false;
        }

        // Whether a use of one of `declarations` fits a shape an older
        // release declared the member with, that release's types being those
        // at index `at` of the history. A use fits the shape a declaration has
        // now. A call to a single declaration, `call` being given, also fits a
        // shape it can make with the same effect: see callFits.
        //
        // `lenient` is for a declaration without @since, whose first typings
        // are all there is to go by: a use then fits unless it is known not to
        // (see callFits), as the older types the history has only hashes of
        // cannot tell. With a @since, the @since decides what cannot be told.
        function fitsShape(
            shape: ShapeEntry,
            at: number,
            declarations: ts.Declaration[],
            call: TSESTree.CallExpression | undefined,
            lenient = false,
        ): boolean {
            // Also the shape with each type alias written as the type it stands
            // for: `View.icon` was `string` before 1.1.0 typed it `IconName`,
            // which is `type IconName = string`. The older shape then names
            // only types that meant then what they mean now, so it is the
            // same type.
            const sameAsNow = declarations.some(
                (declaration) => shapeOf(declaration) === shape.text || aliasFreeShapeOf(declaration) === shape.text,
            );
            if (sameAsNow && history.sameTypes(shape.node, at, declarations[0].getSourceFile())) {
                return true;
            }
            const [declaration] = declarations;
            const callable =
                call !== undefined &&
                shape.node !== undefined &&
                ts.isFunctionTypeNode(shape.node) &&
                (ts.isMethodDeclaration(declaration) ||
                    ts.isMethodSignature(declaration) ||
                    ts.isFunctionDeclaration(declaration));
            if (!callable) {
                // A call to a property of a callable type, such as
                // `requestSaveLayout()`, a `() => void` before 0.16.0 typed it a
                // Debouncer, does the same on the older type when it passes
                // nothing and ignores the result: the older type is a function
                // that needs no argument, or the type it is now, whose call
                // signature stays while other members of it change, such as
                // Debouncer.run().
                if (
                    call !== undefined &&
                    call.arguments.length === 0 &&
                    isResultUnused(call) &&
                    isCallableProperty(declaration) &&
                    shape.node !== undefined &&
                    (sameAsNow ||
                        (ts.isFunctionTypeNode(shape.node) &&
                            callerParameters(shape.node).every(
                                (parameter) => parameter.questionToken || parameter.initializer || parameter.dotDotDotToken,
                            )))
                ) {
                    return true;
                }
                // A read of a property whose type changed, or a call to what
                // was not a signature then, cannot be told.
                return lenient;
            }
            const fits = callFits(shape.node as ts.FunctionTypeNode, declaration, call, at);
            return fits === true || (lenient && fits === undefined);
        }

        // The call to compare with an older shape: `call`, `node` being its
        // callee, when it calls the overload `called`, or the one property
        // `overloads` declares.
        function fittedCall(
            node: TSESTree.Node,
            called: ts.Declaration | undefined,
            overloads: ts.Declaration[],
            call: TSESTree.CallExpression | undefined,
        ): TSESTree.CallExpression | undefined {
            if (called) {
                return call;
            }
            return call?.callee === node && overloads.length === 1 && isCallableProperty(overloads[0]) ? call : undefined;
        }

        // A property whose type can be called, such as a Debouncer.
        function isCallableProperty(declaration: ts.Declaration): boolean {
            return (
                (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) &&
                checker.getTypeAtLocation(declaration).getCallSignatures().length > 0
            );
        }

        // Whether a call to `declaration` would do the same with the older
        // signature `old`: it passes no more arguments than that takes and at
        // least those it requires, each argument is one the old parameter takes
        // too, and the result is either typed the same or unused. When that
        // cannot be told, as for a spread argument, a rest or generic
        // parameter, or a parameter type that changed beyond what the checks
        // below follow, it is undefined; false only when the call is known not
        // to fit: it passes too many or too few arguments, an argument the
        // older type, all of whose types the history knows, does not take, or
        // uses a result the older signature types as a simple other type.
        function callFits(
            old: ts.FunctionTypeNode,
            declaration: ts.SignatureDeclaration,
            call: TSESTree.CallExpression,
            at: number,
        ): boolean | undefined {
            const sourceFile = declaration.getSourceFile();
            const same = (a: ts.TypeNode | undefined, b: ts.TypeNode | undefined) =>
                sameType(a, b, at, sourceFile);
            const oldParameters = callerParameters(old);
            const parameters = callerParameters(declaration);
            if (
                old.typeParameters?.length ||
                declaration.typeParameters?.length ||
                [...oldParameters, ...parameters].some((parameter) => parameter.dotDotDotToken) ||
                call.arguments.some((argument) => argument.type === AST_NODE_TYPES.SpreadElement)
            ) {
                return undefined;
            }
            const required = oldParameters.filter((parameter) => !parameter.questionToken && !parameter.initializer).length;
            if (
                call.arguments.length < required ||
                call.arguments.length > oldParameters.length ||
                call.arguments.length > parameters.length
            ) {
                return false;
            }
            let known = true;
            for (const [index, argument] of call.arguments.entries()) {
                const was = oldParameters[index].type;
                const is = parameters[index].type;
                if (same(was, is) || acceptsAll(was) || callbackFits(was, is, argument, at, sourceFile)) {
                    continue;
                }
                const accepts = olderTypeAccepts(was, argument, at, sourceFile, is);
                if (accepts === false) {
                    return false;
                }
                if (accepts === undefined) {
                    known = false;
                }
            }
            if (
                same(old.type, declaration.type) ||
                isResultUnused(call) ||
                awaitedResultFits(old.type, call, at, sourceFile)
            ) {
                return known ? true : undefined;
            }
            return old.type !== undefined && unionMembers(old.type).every(isSimpleType) ? false : undefined;
        }

        // Whether a function the plugin passes for a parameter typed `is`, which
        // the older release typed `was`, works when that release calls it: each
        // parameter the function declares, the release passes, with a type the
        // function's parameter takes, and the release accepts whatever it
        // returns.
        function callbackFits(
            was: ts.TypeNode | undefined,
            is: ts.TypeNode | undefined,
            argument: TSESTree.CallExpressionArgument,
            at: number,
            sourceFile: ts.SourceFile,
        ): boolean {
            if (
                !was ||
                !is ||
                !ts.isFunctionTypeNode(was) ||
                !ts.isFunctionTypeNode(is) ||
                was.typeParameters?.length ||
                is.typeParameters?.length ||
                thisParameterText(was) !== thisParameterText(is)
            ) {
                return false;
            }
            const oldParameters = callerParameters(was);
            const parameters = callerParameters(is);
            const declared =
                argument.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                argument.type === AST_NODE_TYPES.FunctionExpression
                    ? argument.params.some((param) => param.type === AST_NODE_TYPES.RestElement)
                        ? Infinity
                        : argument.params.filter(
                              (param) => !(param.type === AST_NODE_TYPES.Identifier && param.name === "this"),
                          ).length
                    : parameters.length;
            for (let index = 0; index < Math.min(declared, parameters.length); index++) {
                const oldParameter = oldParameters[index] as ts.ParameterDeclaration | undefined;
                const parameter = parameters[index];
                if (
                    !oldParameter ||
                    oldParameter.dotDotDotToken ||
                    parameter.dotDotDotToken ||
                    (oldParameter.questionToken && !parameter.questionToken) ||
                    !isNarrowerType(oldParameter.type, parameter.type, at, sourceFile)
                ) {
                    return false;
                }
            }
            return ignoresResult(was.type) || sameType(was.type, is.type, at, sourceFile);
        }

        // Whether `was` is `is`, or each type of its union is one of `is`'s.
        function isNarrowerType(
            was: ts.TypeNode | undefined,
            is: ts.TypeNode | undefined,
            at: number,
            sourceFile: ts.SourceFile,
        ): boolean {
            if (sameType(was, is, at, sourceFile) || acceptsAll(is)) {
                return true;
            }
            if (!was || !is) {
                return false;
            }
            const members = unionMembers(is);
            return unionMembers(was).every((member) =>
                members.some((candidate) => sameType(member, candidate, at, sourceFile)),
            );
        }

        // Whether every value the argument can have is of an older parameter
        // type made of `string`, `number`, `boolean`, `null`, `undefined`,
        // literals and names of types that meant then what they mean in the
        // plugin's typings: the `boolean` of `getLeaf(newLeaf?: boolean)` before
        // it took a PaneType, the `Point` of `showAtPosition(position: Point)`
        // before it took a MenuPositionDef.
        function olderTypeAccepts(
            type: ts.TypeNode | undefined,
            argument: TSESTree.CallExpressionArgument,
            at: number,
            sourceFile: ts.SourceFile,
            current?: ts.TypeNode,
        ): boolean | undefined {
            if (!type) {
                return undefined;
            }
            const simple: ts.TypeNode[] = [];
            const named: ts.Type[] = [];
            const currentMembers = current ? unionMembers(current) : [];
            for (const member of unionMembers(type)) {
                if (isSimpleType(member)) {
                    simple.push(member);
                    continue;
                }
                // A member the current parameter type has too, written the same
                // and naming types that meant then what they mean now, such as
                // the `Modifier[]` of `Modifier[] | null`: the current
                // declaration's type for it is the older one's.
                const same =
                    typeof checker.isTypeAssignableTo === "function" && history.sameTypes(member, at, sourceFile)
                        ? currentMembers.find((candidate) => normalize(candidate) === normalize(member))
                        : undefined;
                if (same) {
                    named.push(checker.getTypeFromTypeNode(same));
                    continue;
                }
                const declared =
                    ts.isTypeReferenceNode(member) &&
                    ts.isIdentifier(member.typeName) &&
                    !member.typeArguments &&
                    typeof checker.isTypeAssignableTo === "function" &&
                    history.sameTypes(member, at, sourceFile)
                        ? getDeclaredType(sourceFile, member.typeName.text)
                        : undefined;
                if (!declared) {
                    return undefined;
                }
                named.push(declared);
            }
            const argumentType = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(argument));
            const values = argumentType.isUnion() ? argumentType.types : [argumentType];
            if (values.some((value) => value.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))) {
                return undefined;
            }
            const rejected = values.filter(
                (value) =>
                    !simple.some((member) => simpleTypeHolds(member, value)) &&
                    !named.some((target) => checker.isTypeAssignableTo(value, target)),
            );
            if (rejected.length === 0) {
                return true;
            }
            // Only `null` or `undefined` the older type leaves out, as in
            // `scope.register(null, ...)` before `modifiers` took `null`: without
            // strictNullChecks the older type took them too, and a later release
            // adding `| null` often only writes down what the code did already.
            return rejected.every((value) => value.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void))
                ? undefined
                : false;
        }

        // The type a class, interface, type alias or enum of the plugin's
        // obsidian.d.ts declares, by name.
        function getDeclaredType(sourceFile: ts.SourceFile, name: string): ts.Type | undefined {
            let types = declaredTypes.get(sourceFile);
            if (!types) {
                types = new Map();
                declaredTypes.set(sourceFile, types);
            }
            if (!types.has(name)) {
                const declaration = findTypeDeclaration(sourceFile.statements, name);
                const symbol = declaration?.name && checker.getSymbolAtLocation(declaration.name);
                types.set(name, symbol ? checker.getDeclaredTypeOfSymbol(symbol) : undefined);
            }
            return types.get(name);
        }

        function simpleTypeHolds(member: ts.TypeNode, value: ts.Type): boolean {
            if (value.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
                return false;
            }
            switch (member.kind) {
                case ts.SyntaxKind.StringKeyword:
                    return (value.flags & ts.TypeFlags.StringLike) !== 0;
                case ts.SyntaxKind.NumberKeyword:
                    return (value.flags & ts.TypeFlags.NumberLike) !== 0;
                case ts.SyntaxKind.BooleanKeyword:
                    return (value.flags & ts.TypeFlags.BooleanLike) !== 0;
                case ts.SyntaxKind.UndefinedKeyword:
                    return (value.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0;
            }
            if (!ts.isLiteralTypeNode(member)) {
                return false;
            }
            const literal = member.literal;
            if (literal.kind === ts.SyntaxKind.NullKeyword) {
                return (value.flags & ts.TypeFlags.Null) !== 0;
            }
            if (literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword) {
                return (
                    (value.flags & ts.TypeFlags.BooleanLiteral) !== 0 &&
                    checker.typeToString(value) === (literal.kind === ts.SyntaxKind.TrueKeyword ? "true" : "false")
                );
            }
            if (ts.isStringLiteral(literal)) {
                return value.isStringLiteral() && value.value === literal.text;
            }
            if (ts.isNumericLiteral(literal)) {
                return value.isNumberLiteral() && value.value === Number(literal.text);
            }
            return false;
        }

        // Whether two types are written the same, and each interface, type
        // alias and enum they name meant the same in the older release as in
        // the plugin's typings.
        function sameType(
            was: ts.TypeNode | undefined,
            is: ts.TypeNode | undefined,
            at: number,
            sourceFile: ts.SourceFile,
        ): boolean {
            if (!was || !is) {
                return !was && !is;
            }
            return normalize(was) === normalize(is) && history.sameTypes(was, at, sourceFile);
        }

        // Whether an awaited call gets what the plugin reads from the older
        // release too: that returned a Promise of a type, declared then as in
        // the plugin's typings, that the awaited value's type takes, as the
        // `Promise<RequestUrlResponse>` of `requestUrl()` before 0.16.0 for
        // `await requestUrl({ url })`.
        function awaitedResultFits(
            type: ts.TypeNode | undefined,
            call: TSESTree.CallExpression,
            at: number,
            sourceFile: ts.SourceFile,
        ): boolean {
            const awaited = call.parent?.type === AST_NODE_TYPES.AwaitExpression ? call.parent : undefined;
            const value = type && ts.isTypeReferenceNode(type) ? type.typeArguments?.[0] : undefined;
            if (
                !awaited ||
                !type ||
                !ts.isTypeReferenceNode(type) ||
                !ts.isIdentifier(type.typeName) ||
                type.typeName.text !== "Promise" ||
                type.typeArguments?.length !== 1 ||
                !value ||
                !ts.isTypeReferenceNode(value) ||
                !ts.isIdentifier(value.typeName) ||
                value.typeArguments ||
                typeof checker.isTypeAssignableTo !== "function" ||
                !history.sameTypes(value, at, sourceFile)
            ) {
                return false;
            }
            const old = getDeclaredType(sourceFile, value.typeName.text);
            const read = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(awaited));
            return old !== undefined && !(read.flags & ts.TypeFlags.Any) && checker.isTypeAssignableTo(old, read);
        }

        // Whether nothing reads what the call returns, so a release where it
        // returned something else, as `revealLeaf()` returned void before 1.7.2
        // and a Promise since, behaves the same: a statement of its own, also
        // awaited or after `void`.
        function isResultUnused(call: TSESTree.CallExpression): boolean {
            let node: TSESTree.Node = call;
            if (node.parent?.type === AST_NODE_TYPES.ChainExpression) {
                node = node.parent;
            }
            if (node.parent?.type === AST_NODE_TYPES.AwaitExpression) {
                node = node.parent;
            } else if (node.parent?.type === AST_NODE_TYPES.UnaryExpression && node.parent.operator === "void") {
                return true;
            }
            return node.parent?.type === AST_NODE_TYPES.ExpressionStatement;
        }

        // The version a use of a member needs, from the @since of its
        // declarations. A call needs the version of the overload it calls,
        // when the checker can tell which one that is. Any other use, such as
        // passing the method as a value, and a call that fits several overloads
        // or none, needs the member to exist, which it does from its earliest
        // overload on. An overload without @since needs no version, and one
        // published before its @since (see obsidianOverloadHistory.ts) needs
        // only the version that first had it, or, for a call that uses the
        // result, the first that had its return type. `called` is the overload
        // a call calls, where that is known.
        function requiredVersion(
            qualifiedName: QualifiedName,
            entry: SinceEntry,
            overloads: ts.Declaration[],
            call: TSESTree.CallExpression | undefined,
        ): { version: Version | undefined; called: ts.Declaration | undefined } {
            const resultUsed = call !== undefined && !isResultUnused(call);
            // A declaration the entry does not list, as when the cache was built
            // from another copy of the file, counts as the entry's earliest.
            const sinceOf = (declaration: ts.Declaration): Version | null => {
                const listed = entry.find(([position]) => position === declaration.pos);
                const since = listed ? toSince(listed[1]) : earliestOf(entry.map(([, value]) => toSince(value)));
                return since && firstPublishedSince(qualifiedName, declaration, since, resultUsed);
            };
            const versions = overloads.map(sinceOf);
            const earliest = earliestOf(versions);
            if (!call) {
                return { version: earliest ?? undefined, called: undefined };
            }
            if (versions.every((version) => version === earliest)) {
                return { version: earliest ?? undefined, called: resolvedOverload(call, overloads) };
            }
            const called = calledOverload(call, overloads, sinceOf);
            return { version: (called ? sinceOf(called) : earliest) ?? undefined, called };
        }

        // The overload the checker resolves `call` to, if the call's arguments
        // fit it: the only one, or one of several.
        function resolvedOverload(
            call: TSESTree.CallExpression,
            overloads: ts.Declaration[],
        ): ts.Declaration | undefined {
            const tsCall = services.esTreeNodeToTSNodeMap.get(call);
            const resolved = checker.getResolvedSignature(tsCall)?.declaration;
            if (!resolved || !overloads.includes(resolved)) {
                return undefined;
            }
            if (overloads.length === 1) {
                return resolved;
            }
            const signature = checker
                .getNonNullableType(checker.getTypeAtLocation(tsCall.expression))
                .getCallSignatures()
                .find((candidate) => candidate.declaration === resolved);
            return signature && fits(signature, call, tsCall, false) === true ? resolved : undefined;
        }

        // The overload `call` calls: the one a string literal argument picks
        // out, or else the one the checker resolves it to, if the arguments fit
        // it and fit no overload that needs an older version. Otherwise
        // undefined: for a call that fits no overload the checker still returns
        // one, and `any` arguments fit several.
        function calledOverload(
            call: TSESTree.CallExpression,
            overloads: ts.Declaration[],
            sinceOf: (declaration: ts.Declaration) => Version | null,
        ): ts.Declaration | undefined {
            const byLiteral = overloadByLiteral(call, overloads);
            if (byLiteral) {
                return byLiteral;
            }
            const tsCall = services.esTreeNodeToTSNodeMap.get(call);
            const resolved = checker.getResolvedSignature(tsCall)?.declaration;
            if (!resolved || !overloads.includes(resolved)) {
                return undefined;
            }
            const since = sinceOf(resolved);
            const older = overloads.filter((overload) => {
                const version = sinceOf(overload);
                return overload !== resolved && since !== null && (version === null || lt(version, since));
            });
            if (older.length === 0) {
                return resolved;
            }
            // The overloads as the callee's type has them, with its type
            // arguments and `this` filled in.
            const signatures = checker
                .getNonNullableType(checker.getTypeAtLocation(tsCall.expression))
                .getCallSignatures();
            const fitsOverload = (overload: ts.Declaration, lenient: boolean) => {
                const signature = signatures.find((candidate) => candidate.declaration === overload);
                return signature && fits(signature, call, tsCall, lenient);
            };
            return fitsOverload(resolved, false) === true &&
                older.every((overload) => fitsOverload(overload, true) === false)
                ? resolved
                : undefined;
        }

        // The overload a string literal argument picks out, whatever the other
        // arguments are: where every overload types the parameter at that
        // position as a string literal, as `Workspace.on()` does with its event
        // names, the one whose literal it is. A callback typed for another
        // version's signature, which the checker then fits to no overload, is
        // still a call for that event.
        function overloadByLiteral(
            call: TSESTree.CallExpression,
            overloads: ts.Declaration[],
        ): ts.Declaration | undefined {
            const literals = overloads.map((overload) => (ts.isFunctionLike(overload) ? getLiteralParameters(overload) : []));
            for (const [index, argument] of call.arguments.entries()) {
                if (argument.type === AST_NODE_TYPES.SpreadElement) {
                    return undefined;
                }
                if (literals.some((parameters) => parameters[index] === undefined)) {
                    continue;
                }
                const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(argument));
                const matching = type.isStringLiteral()
                    ? overloads.filter((_, i) => literals[i][index] === type.value)
                    : [];
                if (matching.length === 1) {
                    return matching[0];
                }
            }
            return undefined;
        }

        // Whether the arguments of `call` fit the parameters of `signature` by
        // type, or undefined where that cannot be told: a spread argument, a
        // rest parameter, a generic signature. With `lenient`, for an overload
        // the call does not resolve to, an argument holding a function with a
        // parameter left untyped is undecided too: that parameter took its type
        // from the overload the call resolves to, and would take this one's here.
        function fits(
            signature: ts.Signature,
            call: TSESTree.CallExpression,
            tsCall: ts.Node,
            lenient: boolean,
        ): boolean | undefined {
            const parameters = signature.getParameters();
            const declarations = parameters.map((parameter) => parameter.valueDeclaration);
            if (
                signature.typeParameters?.length ||
                typeof checker.isTypeAssignableTo !== "function" ||
                call.arguments.some((argument) => argument.type === AST_NODE_TYPES.SpreadElement) ||
                !declarations.every(
                    (declaration): declaration is ts.ParameterDeclaration =>
                        declaration !== undefined && ts.isParameter(declaration) && !declaration.dotDotDotToken,
                )
            ) {
                return undefined;
            }
            const required = declarations.filter((declaration) => !declaration.questionToken && !declaration.initializer).length;
            if (call.arguments.length < required || call.arguments.length > parameters.length) {
                return false;
            }
            let decided = true;
            for (const [index, argument] of call.arguments.entries()) {
                const argumentType = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(argument));
                const parameterType = checker.getTypeOfSymbolAtLocation(parameters[index], tsCall);
                if (checker.isTypeAssignableTo(argumentType, parameterType)) {
                    continue;
                }
                if (!lenient || !isContextSensitive(argument)) {
                    return false;
                }
                decided = false;
            }
            return decided || undefined;
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
                    if (truthy && isRequireApiVersion(expr.callee) && expr.arguments.length >= 1) {
                        return getArgumentVersion(expr.arguments[0]);
                    }
                    return undefined;
                case AST_NODE_TYPES.BinaryExpression: {
                    const compared = comparedWithBoolean(expr, truthy);
                    return compared && versionWhen(compared.operand, compared.truthy, seen);
                }
                case AST_NODE_TYPES.MemberExpression: {
                    const init = getReadonlyFieldInitializer(expr);
                    if (!init || seen.has(init)) {
                        return undefined;
                    }
                    seen.add(init);
                    const version = versionWhen(init, truthy, seen);
                    seen.delete(init);
                    return version;
                }
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

        // The members a test proves to exist when it evaluates truthy (or
        // falsy), by featureKey: `typeof x.m === "function"`, `typeof x.m !==
        // "undefined"`, `x.m != null`, `"m" in x` and `x.m` itself, also negated
        // and combined with `&&` and `||`.
        function featuresWhen(
            expr: TSESTree.Expression,
            truthy: boolean,
            seen: Set<TSESTree.Node> = new Set(),
        ): Set<string> {
            switch (expr.type) {
                case AST_NODE_TYPES.UnaryExpression:
                    return expr.operator === "!" ? featuresWhen(expr.argument, !truthy, seen) : new Set();
                case AST_NODE_TYPES.Identifier: {
                    // `const canX = typeof x.m === "function"`, tested later.
                    const init = getConstInitializer(expr);
                    if (!init || seen.has(init)) {
                        return new Set();
                    }
                    seen.add(init);
                    const features = featuresWhen(init, truthy, seen);
                    seen.delete(init);
                    return features;
                }
                case AST_NODE_TYPES.LogicalExpression: {
                    if (expr.operator === "??") {
                        return new Set();
                    }
                    const left = featuresWhen(expr.left, truthy, seen);
                    const right = featuresWhen(expr.right, truthy, seen);
                    // As in versionWhen: both sides held, or only one of them.
                    return (expr.operator === "&&") === truthy
                        ? new Set([...left, ...right])
                        : new Set([...left].filter((key) => right.has(key)));
                }
                case AST_NODE_TYPES.BinaryExpression: {
                    if (expr.operator === "in") {
                        const object = featureKey(expr.right);
                        return truthy &&
                            object !== undefined &&
                            expr.left.type === AST_NODE_TYPES.Literal &&
                            typeof expr.left.value === "string"
                            ? new Set([`${object}.${expr.left.value}`])
                            : new Set();
                    }
                    const compared = comparedWithBoolean(expr, truthy);
                    if (compared) {
                        return featuresWhen(compared.operand, compared.truthy, seen);
                    }
                    const negated = expr.operator === "!==" || expr.operator === "!=";
                    if (!negated && expr.operator !== "===" && expr.operator !== "==") {
                        return new Set();
                    }
                    const sides: [TSESTree.Node, TSESTree.Node][] = [
                        [expr.left, expr.right],
                        [expr.right, expr.left],
                    ];
                    for (const [subject, other] of sides) {
                        const typeOf =
                            subject.type === AST_NODE_TYPES.UnaryExpression && subject.operator === "typeof"
                                ? featureKey(subject.argument)
                                : undefined;
                        const literal = other.type === AST_NODE_TYPES.Literal ? other.value : undefined;
                        // `typeof x.m === "function"` and `typeof x.m !== "undefined"`.
                        if (typeOf !== undefined && (literal === "function" || literal === "undefined")) {
                            const exists = literal === "function" ? !negated : negated;
                            return exists === truthy ? new Set([typeOf]) : new Set();
                        }
                        // `x.m != null`, `x.m != undefined` and `x.m !== undefined`,
                        // but not `x.m !== null`, which holds for a missing member,
                        // nor `g != null` for a global `g`, which throws a
                        // ReferenceError where the app does not declare it.
                        const key = isBareGlobal(subject) ? undefined : featureKey(subject);
                        const loose = expr.operator === "==" || expr.operator === "!=";
                        const isUndefined = other.type === AST_NODE_TYPES.Identifier && other.name === "undefined";
                        const isNull = other.type === AST_NODE_TYPES.Literal && other.raw === "null";
                        if (
                            key !== undefined &&
                            typeOf === undefined &&
                            negated === truthy &&
                            (isUndefined || (loose && isNull))
                        ) {
                            return new Set([key]);
                        }
                    }
                    return new Set();
                }
                case AST_NODE_TYPES.MemberExpression:
                case AST_NODE_TYPES.ChainExpression:
                case AST_NODE_TYPES.TSNonNullExpression: {
                    const key = featureKey(expr);
                    return truthy && key !== undefined ? new Set([key]) : new Set();
                }
                default:
                    return new Set();
            }
        }

        // Whether `callee` is Obsidian's requireApiVersion(), however the plugin
        // names it: `requireApiVersion`, an alias such as `rav` from `import {
        // requireApiVersion as rav }`, or `obsidian.requireApiVersion` from
        // `import * as obsidian`.
        function isRequireApiVersion(callee: TSESTree.Expression): boolean {
            if (callee.type === AST_NODE_TYPES.Identifier && callee.name === "requireApiVersion") {
                return true;
            }
            if (callee.type !== AST_NODE_TYPES.Identifier && callee.type !== AST_NODE_TYPES.MemberExpression) {
                return false;
            }
            const symbol = checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(callee));
            if (!symbol) {
                return false;
            }
            const resolved = resolveSymbol(symbol);
            return (
                resolved.getName() === "requireApiVersion" &&
                (resolved.getDeclarations() ?? []).some(
                    (declaration) => ts.isFunctionDeclaration(declaration) && isObsidianDeclaration(declaration),
                )
            );
        }

        // The initializer of a readonly field that `node` reads, as `this.hasX`
        // reads `private readonly hasX = requireApiVersion("1.10.0")`: nothing
        // assigns the field after, as long as the file assigns `.hasX` nowhere,
        // not even in a constructor.
        function getReadonlyFieldInitializer(node: TSESTree.MemberExpression): TSESTree.Expression | undefined {
            const name = memberName(node);
            if (name === undefined || node.object.type !== AST_NODE_TYPES.ThisExpression) {
                return undefined;
            }
            const symbol = checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node));
            const declarations = symbol?.getDeclarations() ?? [];
            const [declaration] = declarations;
            if (
                declarations.length !== 1 ||
                !ts.isPropertyDeclaration(declaration) ||
                !declaration.initializer ||
                declaration.getSourceFile() !== services.program.getSourceFile(context.filename) ||
                !declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ||
                declaration.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
            ) {
                return undefined;
            }
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (new RegExp(`\\.\\s*${escaped}\\s*(?:[-+*/%&|^]|\\*\\*|<<|>>>?|&&|\\|\\||\\?\\?)?=(?!=)`).test(context.sourceCode.text)) {
                return undefined;
            }
            const init = services.tsNodeToESTreeNodeMap.get(declaration.initializer);
            return init as TSESTree.Expression | undefined;
        }

        // The version the use `node` proves by running at all, from an earlier
        // optional link of its chain: `app.secretStorage?.getSecret()` calls
        // getSecret() only where `app.secretStorage` exists, so on a release
        // that has App.secretStorage. The lowest version that has the member
        // the link tests, as with versionOfOverride.
        function optionalChainVersion(node: TSESTree.Node): Version | undefined {
            let proven: Version | undefined;
            let link: TSESTree.Node = node;
            for (;;) {
                let inner: TSESTree.Node;
                if (link.type === AST_NODE_TYPES.MemberExpression) {
                    inner = link.object;
                } else if (link.type === AST_NODE_TYPES.CallExpression) {
                    inner = link.callee;
                } else if (link.type === AST_NODE_TYPES.TSNonNullExpression) {
                    link = link.expression;
                    continue;
                } else {
                    return proven;
                }
                const optional =
                    (link.type === AST_NODE_TYPES.MemberExpression || link.type === AST_NODE_TYPES.CallExpression) &&
                    link.optional;
                if (optional && inner.type === AST_NODE_TYPES.MemberExpression) {
                    const version = existenceVersion(inner);
                    if (version && (!proven || gt(version, proven))) {
                        proven = version;
                    }
                }
                link = inner;
            }
        }

        // The first release that has the Obsidian member `node` reads: the
        // lowest of its @since and the first typings that declare it, for each
        // declaration it stands for.
        function existenceVersion(node: TSESTree.MemberExpression): Version | undefined {
            const symbol = checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node));
            if (!symbol) {
                return undefined;
            }
            const resolved = resolveSymbol(symbol);
            let lowest: Version | undefined;
            for (const declaration of resolved.getDeclarations() ?? []) {
                const parentName = getParentTypeName(declaration);
                if (!parentName || !isObsidianDeclaration(declaration) || isPluginSuppliedMember(declaration)) {
                    return undefined;
                }
                const qualifiedName = `${parentName}.${resolved.getName()}`;
                const entry = sinceMap.get(qualifiedName);
                const since = entry && earliestOf(entry.map(([, value]) => toSince(value)));
                const declared = history.firstDeclared(qualifiedName, () => true);
                const version = since && declared ? (lt(declared, since) ? declared : since) : since ?? declared;
                if (!version) {
                    return undefined;
                }
                if (!lowest || lt(version, lowest)) {
                    lowest = version;
                }
            }
            return lowest;
        }

        // Whether `node` is a global variable or function the app declares,
        // such as `activeDocument` or `createDiv`, not a module import or a
        // variable of the plugin's: reading it throws a ReferenceError on a
        // release that does not have it, so only `typeof` tests it safely.
        function isBareGlobal(node: TSESTree.Node): boolean {
            if (node.type !== AST_NODE_TYPES.Identifier) {
                return false;
            }
            if (node.parent?.type === AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") {
                return false;
            }
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
            return !variable || variable.defs.length === 0;
        }

        // The version an override of one of the OBSIDIAN_CALLED_HOOKS proves
        // for its own body: Obsidian calls the override only from the release
        // that added the method on. `getSettingDefinitions()` in a SettingTab
        // subclass runs on 1.13.0 and later, and `onPaneMenu()` in a View on
        // 0.15.3 and later. The release that added it is the first that
        // declares it, or its @since when that is lower. A file that names the
        // method other than as `super.name`, as `this.getSettingDefinitions()`,
        // may call it itself on an earlier release, so there it proves nothing.
        function versionOfOverride(method: TSESTree.MethodDefinition): Version | undefined {
            if (
                method.static ||
                method.kind !== "method" ||
                method.computed ||
                method.key.type !== AST_NODE_TYPES.Identifier ||
                !OBSIDIAN_CALLED_HOOKS.has(method.key.name)
            ) {
                return undefined;
            }
            const name = method.key.name;
            if (new RegExp(`(?<!\\bsuper\\s*)\\.\\s*${name}\\b`).test(context.sourceCode.text)) {
                return undefined;
            }
            const tsClass = services.esTreeNodeToTSNodeMap.get(method.parent.parent) as ts.ClassLikeDeclaration;
            const classSymbol = tsClass.name
                ? checker.getSymbolAtLocation(tsClass.name)
                : checker.getTypeAtLocation(tsClass).getSymbol();
            if (!classSymbol) {
                return undefined;
            }
            const instance = checker.getDeclaredTypeOfSymbol(classSymbol);
            if (!instance.isClassOrInterface()) {
                return undefined;
            }
            let proven: Version | undefined;
            for (const base of checker.getBaseTypes(instance)) {
                for (const declaration of base.getProperty(name)?.getDeclarations() ?? []) {
                    const parentName = getParentTypeName(declaration);
                    if (!parentName || !isObsidianDeclaration(declaration) || isPluginSuppliedMember(declaration)) {
                        continue;
                    }
                    const qualifiedName = `${parentName}.${name}`;
                    const entry = sinceMap.get(qualifiedName);
                    const since = entry && earliestOf(entry.map(([, value]) => toSince(value)));
                    if (!since) {
                        continue;
                    }
                    const declared = history.firstDeclared(qualifiedName, () => true);
                    const version = declared && lt(declared, since) ? declared : since;
                    if (!proven || gt(version, proven)) {
                        proven = version;
                    }
                }
            }
            return proven;
        }

        // Whether `node` can only run once a check has proven `sinceVersion`
        // available: a `requireApiVersion` check, being in an override of a
        // method only that version calls, or, where the member existing is
        // all the use needs, a check that `feature` exists.
        function isGuardedByRequireApiVersion(
            node: TSESTree.Node,
            sinceVersion: string,
            feature: string | undefined,
        ): boolean {
            const covers = (version: Version | undefined) =>
                version !== undefined && !gt(sinceVersion, version);
            const proves = (test: TSESTree.Expression, truthy: boolean) =>
                covers(versionWhen(test, truthy)) ||
                (feature !== undefined && provesFeature(featuresWhen(test, truthy), feature));

            if (covers(optionalChainVersion(node))) {
                return true;
            }

            let current: TSESTree.Node | undefined = node.parent;
            let prevChild: TSESTree.Node = node;

            while (current) {
                if (
                    current.type === AST_NODE_TYPES.IfStatement ||
                    current.type === AST_NODE_TYPES.ConditionalExpression
                ) {
                    if (prevChild === current.consequent && proves(current.test, true)) {
                        return true;
                    }
                    if (prevChild === current.alternate && proves(current.test, false)) {
                        return true;
                    }
                } else if (current.type === AST_NODE_TYPES.LogicalExpression) {
                    if (
                        prevChild === current.right &&
                        current.operator !== "??" &&
                        proves(current.left, current.operator === "&&")
                    ) {
                        return true;
                    }
                } else if (
                    current.type === AST_NODE_TYPES.MethodDefinition &&
                    prevChild === current.value &&
                    covers(versionOfOverride(current))
                ) {
                    return true;
                } else if (
                    !isHoistedFunction(prevChild) &&
                    getEarlyExits(current).some(
                        (exit) =>
                            exit.end <= prevChild.range[0] &&
                            (covers(exit.version) || (feature !== undefined && provesFeature(exit.features, feature))),
                    )
                ) {
                    return true;
                }
                prevChild = current;
                current = current.parent;
            }
            return false;
        }

        // The early exits of a statement list, with the version each proves
        // for the statements after it. Read once per list: going over the
        // statements before each reported node is quadratic in a long list
        // that reports many.
        function getEarlyExits(container: TSESTree.Node): EarlyExit[] {
            let exits = earlyExits.get(container);
            if (!exits) {
                exits = [];
                for (const statement of getStatements(container)) {
                    const exit = afterEarlyExit(statement);
                    if (exit && (exit.version !== undefined || exit.features.size > 0)) {
                        exits.push({ end: statement.range[1], ...exit });
                    }
                }
                earlyExits.set(container, exits);
            }
            return exits;
        }

        // The version and the members proven for the statements after `if
        // (test) <exit>`, which only run when `test` was falsy (or truthy, for
        // `if (test) {} else <exit>`).
        function afterEarlyExit(
            statement: TSESTree.Statement,
        ): { version: Version | undefined; features: Set<string> } | undefined {
            if (statement.type !== AST_NODE_TYPES.IfStatement) {
                return undefined;
            }
            const consequentExits = alwaysExits(statement.consequent);
            const alternateExits = statement.alternate !== null && alwaysExits(statement.alternate);
            if (consequentExits === alternateExits) {
                return undefined;
            }
            const truthy = alternateExits;
            return { version: versionWhen(statement.test, truthy), features: featuresWhen(statement.test, truthy) };
        }
    }
});

// Whether an argument's type depends on the parameter it is passed to: a
// function with a parameter left untyped, also as a property, an element or a
// branch of the argument, as `{ onOpen: (leaf) => {} }` or `ok ? (a) => a : f`.
function isContextSensitive(node: TSESTree.Node): boolean {
    switch (node.type) {
        case AST_NODE_TYPES.ArrowFunctionExpression:
        case AST_NODE_TYPES.FunctionExpression:
            return node.params.some((param) => !("typeAnnotation" in param && param.typeAnnotation));
        case AST_NODE_TYPES.ObjectExpression:
            return node.properties.some((property) =>
                isContextSensitive(property.type === AST_NODE_TYPES.Property ? property.value : property.argument),
            );
        case AST_NODE_TYPES.ArrayExpression:
            return node.elements.some((element) => element !== null && isContextSensitive(element));
        case AST_NODE_TYPES.SpreadElement:
            return isContextSensitive(node.argument);
        case AST_NODE_TYPES.ConditionalExpression:
            return isContextSensitive(node.consequent) || isContextSensitive(node.alternate);
        case AST_NODE_TYPES.LogicalExpression:
            return isContextSensitive(node.left) || isContextSensitive(node.right);
        default:
            return false;
    }
}

// Methods only Obsidian calls, which a plugin overrides: settings definitions
// and their values (1.13), the external change to data.json (1.5.7), the
// pane menu (0.15.3) and the user enabling the plugin (1.7.2).
const OBSIDIAN_CALLED_HOOKS = new Set([
    "getSettingDefinitions",
    "getControlValue",
    "setControlValue",
    "onExternalSettingsChange",
    "onPaneMenu",
    "onUserEnable",
]);

// A shape an older release declared a member with, from
// obsidianDeclarationHistory.ts: its text, parsed, and whether each release of
// DECLARATION_HISTORY_VERSIONS had it.
interface ShapeEntry {
    text: string;
    node: ts.Node | undefined;
    present: boolean[];
    // The types it names that TYPE_HISTORY follows.
    types: string[];
}

function parseRanges(ranges: string): boolean[] {
    const present = DECLARATION_HISTORY_VERSIONS.map(() => false);
    for (const range of ranges.split(",")) {
        const [start, end = start] = range.split("-").map(Number);
        for (let i = start; i <= end; i++) {
            present[i] = true;
        }
    }
    return present;
}

const shapeEntries = new Map<QualifiedName, ShapeEntry[] | undefined>();

function getShapeEntries(qualifiedName: QualifiedName): ShapeEntry[] | undefined {
    if (!shapeEntries.has(qualifiedName)) {
        const listed = Object.hasOwn(DECLARATION_HISTORY, qualifiedName) ? DECLARATION_HISTORY[qualifiedName] : undefined;
        shapeEntries.set(
            qualifiedName,
            listed?.map(([ranges, text]) => {
                const node = parseShape(text);
                return {
                    text,
                    node,
                    present: parseRanges(ranges),
                    types: node ? [...referencedTypeNames(node)].filter((name) => Object.hasOwn(TYPE_HISTORY, name)) : [],
                };
            }),
        );
    }
    return shapeEntries.get(qualifiedName);
}

const typeHashesAt = new Map<string, (string | undefined)[]>();

// The hash TYPE_HISTORY gives a type in each release, undefined where the
// release does not declare it as an interface, type alias or enum.
function getTypeHashes(name: string): (string | undefined)[] {
    let hashes = typeHashesAt.get(name);
    if (!hashes) {
        hashes = DECLARATION_HISTORY_VERSIONS.map(() => undefined);
        for (const [ranges, hash] of Object.hasOwn(TYPE_HISTORY, name) ? TYPE_HISTORY[name] : []) {
            parseRanges(ranges).forEach((present, i) => {
                if (present) {
                    hashes![i] = hash;
                }
            });
        }
        typeHashesAt.set(name, hashes);
    }
    return hashes;
}

const installedTypeHashes = new WeakMap<ts.SourceFile, (name: string) => string | undefined>();

function getInstalledTypeHash(sourceFile: ts.SourceFile, name: string): string | undefined {
    let hash = installedTypeHashes.get(sourceFile);
    if (!hash) {
        hash = typeHashes(indexTypeDeclarations(sourceFile));
        installedTypeHashes.set(sourceFile, hash);
    }
    return hash(name);
}

interface DeclarationHistory {
    // The release from which on, up to the plugin's typings, every release
    // declared the member with a shape `fits` accepts, or undefined where the
    // history has no such release or does not list the member.
    firstDeclared(
        qualifiedName: QualifiedName,
        fits: (shape: ShapeEntry, at: number) => boolean,
    ): Version | undefined;
    // Whether every type `node` names that TYPE_HISTORY follows meant in the
    // release at index `at` what it means in the plugin's typings.
    sameTypes(node: ts.Node | undefined, at: number, sourceFile: ts.SourceFile): boolean;
}

const histories = new Map<string, DeclarationHistory>();

function getDeclarationHistory(dtsPath: string): DeclarationHistory {
    let history = histories.get(dtsPath);
    if (!history) {
        history = declarationHistoryFor(getObsidianVersion(dtsPath));
        histories.set(dtsPath, history);
    }
    return history;
}

// The history up to the plugin's own typings: a release after those says
// nothing about what the plugin's typings declare.
function declarationHistoryFor(installedVersion: string | undefined): DeclarationHistory {
    const installed = installedVersion && valid(installedVersion);
    let last = DECLARATION_HISTORY_VERSIONS.length - 1;
    while (installed && last >= 0 && gt(DECLARATION_HISTORY_VERSIONS[last], installed)) {
        last--;
    }
    const sameTypes = (node: ts.Node | undefined, at: number, sourceFile: ts.SourceFile) =>
        node !== undefined &&
        [...referencedTypeNames(node)].every(
            (name) => getTypeHashes(name)[at] === getInstalledTypeHash(sourceFile, name),
        );
    return {
        firstDeclared(qualifiedName, fits) {
            const entries = getShapeEntries(qualifiedName);
            if (!entries) {
                return undefined;
            }
            // Whether a shape fits depends on the release only through the
            // types it names, which change in few releases.
            const decided = new Map<string, boolean>();
            const fitsAt = (entry: ShapeEntry, at: number) => {
                const key = `${entries.indexOf(entry)}:${entry.types.map((name) => getTypeHashes(name)[at]).join(",")}`;
                let result = decided.get(key);
                if (result === undefined) {
                    result = fits(entry, at);
                    decided.set(key, result);
                }
                return result;
            };
            let first: number | undefined;
            for (let at = last; at >= 0; at--) {
                if (!entries.some((entry) => entry.present[at] && fitsAt(entry, at))) {
                    break;
                }
                first = at;
            }
            return first === undefined ? undefined : DECLARATION_HISTORY_VERSIONS[first];
        },
        sameTypes,
    };
}

const shapes = new WeakMap<ts.Declaration, string | undefined>();

// A declaration of the plugin's typings written as the history writes it.
function shapeOf(declaration: ts.Declaration): string | undefined {
    if (!shapes.has(declaration)) {
        shapes.set(
            declaration,
            ts.isClassDeclaration(declaration)
                ? classShape(declaration)
                : ts.isFunctionDeclaration(declaration)
                  ? signatureShape(declaration)
                  : memberShape(declaration),
        );
    }
    return shapes.get(declaration);
}

const aliasFreeShapes = new WeakMap<ts.Declaration, string | undefined>();

// A declaration's shape with each type alias of its typings written as the
// type it stands for, `IconName` as `string`, or undefined where it names no
// alias.
function aliasFreeShapeOf(declaration: ts.Declaration): string | undefined {
    if (!aliasFreeShapes.has(declaration)) {
        const sourceFile = declaration.getSourceFile();
        let inlined = false;
        const expanding = new Set<string>();
        const inline: InlineReference = (reference) => {
            if (!ts.isIdentifier(reference.typeName) || reference.typeArguments) {
                return undefined;
            }
            const name = reference.typeName.text;
            const alias = findTypeDeclaration(sourceFile.statements, name);
            if (!alias || !ts.isTypeAliasDeclaration(alias) || alias.typeParameters || expanding.has(name)) {
                return undefined;
            }
            expanding.add(name);
            const text = normalize(alias.type, inline);
            expanding.delete(name);
            inlined = true;
            return needsParentheses(alias.type, reference) ? `(${text})` : text;
        };
        const shape = ts.isFunctionDeclaration(declaration)
            ? signatureShape(declaration, inline)
            : memberShape(declaration, inline);
        aliasFreeShapes.set(declaration, inlined ? shape : undefined);
    }
    return aliasFreeShapes.get(declaration);
}

// Whether a type written in place of `reference` needs parentheses to keep
// its meaning: a union in an array type, `(string | null)[]`, and the like.
function needsParentheses(type: ts.TypeNode, reference: ts.TypeReferenceNode): boolean {
    const compound =
        ts.isUnionTypeNode(type) ||
        ts.isIntersectionTypeNode(type) ||
        ts.isFunctionTypeNode(type) ||
        ts.isConstructorTypeNode(type) ||
        ts.isConditionalTypeNode(type);
    const parent = reference.parent;
    return (
        compound &&
        (ts.isArrayTypeNode(parent) ||
            ts.isIndexedAccessTypeNode(parent) ||
            ts.isTypeOperatorNode(parent) ||
            ts.isIntersectionTypeNode(parent) ||
            ts.isOptionalTypeNode(parent) ||
            ts.isRestTypeNode(parent) ||
            (ts.isUnionTypeNode(parent) && !ts.isUnionTypeNode(type)))
    );
}

// The parameters a caller passes, without a `this: …` one.
function callerParameters(declaration: ts.SignatureDeclaration): ts.ParameterDeclaration[] {
    return declaration.parameters.filter(
        (parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === "this"),
    );
}

function thisParameterText(declaration: ts.SignatureDeclaration): string {
    const parameter = declaration.parameters.find(
        (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === "this",
    );
    return parameter?.type ? normalize(parameter.type) : "";
}

function unionMembers(type: ts.TypeNode): ts.TypeNode[] {
    if (ts.isParenthesizedTypeNode(type)) {
        return unionMembers(type.type);
    }
    return ts.isUnionTypeNode(type) ? type.types.flatMap(unionMembers) : [type];
}

// `any` or `unknown`, or no type, which is `any`.
function acceptsAll(type: ts.TypeNode | undefined): boolean {
    return !type || type.kind === ts.SyntaxKind.AnyKeyword || type.kind === ts.SyntaxKind.UnknownKeyword;
}

// A callback's return type with which the caller takes whatever it returns.
function ignoresResult(type: ts.TypeNode | undefined): boolean {
    return acceptsAll(type) || type?.kind === ts.SyntaxKind.VoidKeyword;
}

function isSimpleType(type: ts.TypeNode): boolean {
    switch (type.kind) {
        case ts.SyntaxKind.StringKeyword:
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.BooleanKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
            return true;
    }
    return ts.isLiteralTypeNode(type);
}

function findTypeDeclaration(
    statements: ts.NodeArray<ts.Statement>,
    name: string,
): ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | undefined {
    for (const statement of statements) {
        if (
            (ts.isClassDeclaration(statement) ||
                ts.isInterfaceDeclaration(statement) ||
                ts.isTypeAliasDeclaration(statement) ||
                ts.isEnumDeclaration(statement)) &&
            statement.name?.text === name
        ) {
            return statement;
        }
        if (
            ts.isModuleDeclaration(statement) &&
            (statement.flags & ts.NodeFlags.GlobalAugmentation) === 0 &&
            statement.body &&
            ts.isModuleBlock(statement.body)
        ) {
            const found = findTypeDeclaration(statement.body.statements, name);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

// The variables the history lists without @since, such as activeDocument
// and apiVersion, and every declaration it lists without one.
const UNDATED_NAMES = new Set(UNDATED_DECLARATIONS);
const UNDATED_VARIABLES = new Set(
    UNDATED_DECLARATIONS.filter(
        (name) =>
            !name.includes(".") &&
            DECLARATION_HISTORY[name]?.every(([, shape]) => shape.startsWith(":") || shape.startsWith("?:")),
    ),
);

// Whether an identifier reads a value: not a property name, a declaration, an
// import or export name, or a name in a type.
function isValueReference(node: TSESTree.Identifier): boolean {
    const parent = node.parent;
    switch (parent?.type) {
        case AST_NODE_TYPES.MemberExpression:
            return parent.object === node || parent.computed;
        case AST_NODE_TYPES.Property:
            return parent.value === node || parent.shorthand || (parent.computed && parent.key === node);
        case AST_NODE_TYPES.PropertyDefinition:
            return parent.value === node || (parent.computed && parent.key === node);
        case AST_NODE_TYPES.MethodDefinition:
        case AST_NODE_TYPES.TSPropertySignature:
            return parent.computed && parent.key === node;
        case AST_NODE_TYPES.VariableDeclarator:
            return parent.init === node;
        case AST_NODE_TYPES.CallExpression:
            return parent.callee !== node;
        case AST_NODE_TYPES.ImportSpecifier:
        case AST_NODE_TYPES.ImportDefaultSpecifier:
        case AST_NODE_TYPES.ImportNamespaceSpecifier:
        case AST_NODE_TYPES.ExportSpecifier:
        case AST_NODE_TYPES.TSTypeReference:
        case AST_NODE_TYPES.TSTypeQuery:
        case AST_NODE_TYPES.TSQualifiedName:
        case AST_NODE_TYPES.FunctionDeclaration:
        case AST_NODE_TYPES.FunctionExpression:
        case AST_NODE_TYPES.ArrowFunctionExpression:
        case AST_NODE_TYPES.ClassDeclaration:
        case AST_NODE_TYPES.LabeledStatement:
        case AST_NODE_TYPES.BreakStatement:
        case AST_NODE_TYPES.ContinueStatement:
            return false;
        default:
            return true;
    }
}

// Whether `node` is the target of an assignment to a property, which sets it
// whether or not the release has it.
function isPropertyWrite(node: TSESTree.Node, declarations: ts.Declaration[]): boolean {
    return (
        node.parent?.type === AST_NODE_TYPES.AssignmentExpression &&
        node.parent.left === node &&
        declarations.every((declaration) => ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration))
    );
}

// Whether `node` is only tested, which works where it is missing too: `typeof
// x.m`, `x.m == null`, `!x.m`, and `x.m` as the condition of an `if`, a loop or
// a ternary, or as an operand of `&&`, `||` or `??` there or on its left; also
// as the object of an optional access, the `x.m` of `x.m?.n`. Not for
// a global the app declares, `activeDocument` (see isBareGlobal).
function isFeatureTest(node: TSESTree.Node): boolean {
    let current = node;
    while (
        current.parent?.type === AST_NODE_TYPES.TSNonNullExpression ||
        (current.parent?.type === AST_NODE_TYPES.ChainExpression && current.parent.expression === current)
    ) {
        current = current.parent;
    }
    // `x.m?.n` reads `x.m` and goes no further where it is missing. Not
    // `x.m?.()`, which calls it where it exists, with the arguments of today's
    // signature.
    if (
        current.parent?.type === AST_NODE_TYPES.MemberExpression &&
        current.parent.object === current &&
        current.parent.optional
    ) {
        return true;
    }
    const parent = current.parent;
    if (!parent) {
        return false;
    }
    switch (parent.type) {
        case AST_NODE_TYPES.UnaryExpression:
            return parent.operator === "typeof" || parent.operator === "!";
        case AST_NODE_TYPES.BinaryExpression: {
            if (!["==", "!=", "===", "!=="].includes(parent.operator)) {
                return false;
            }
            const other = parent.left === current ? parent.right : parent.left;
            return (
                (other.type === AST_NODE_TYPES.Literal && other.raw === "null") ||
                (other.type === AST_NODE_TYPES.Identifier && other.name === "undefined")
            );
        }
        case AST_NODE_TYPES.IfStatement:
        case AST_NODE_TYPES.ConditionalExpression:
        case AST_NODE_TYPES.WhileStatement:
        case AST_NODE_TYPES.DoWhileStatement:
        case AST_NODE_TYPES.ForStatement:
            return parent.test === current;
        case AST_NODE_TYPES.LogicalExpression:
            // `x.m ?? fallback` and `x.m || fallback` as well as `x.m && x.m()`.
            return parent.left === current || isFeatureTest(parent);
        default:
            return false;
    }
}

// The operand of a comparison with `true` or `false`, and whether it is truthy
// when the comparison evaluates `truthy`: `requireApiVersion("1.10.0") ===
// true`, `canX !== false`.
function comparedWithBoolean(
    expr: TSESTree.BinaryExpression,
    truthy: boolean,
): { operand: TSESTree.Expression; truthy: boolean } | undefined {
    const equal = expr.operator === "===" || expr.operator === "==";
    if (!equal && expr.operator !== "!==" && expr.operator !== "!=") {
        return undefined;
    }
    for (const [operand, other] of [
        [expr.left, expr.right],
        [expr.right, expr.left],
    ] as const) {
        if (other.type === AST_NODE_TYPES.Literal && typeof other.value === "boolean") {
            return { operand, truthy: (truthy === equal) === other.value };
        }
    }
    return undefined;
}

// What a feature check names, written the same way wherever it appears:
// `this.editor.transaction` for `this.editor?.transaction` and
// `this.editor!.transaction`. Undefined for anything else, such as a computed
// access with a variable.
type MessageId = "apiNotAvailable" | "apiNotAvailableCheck" | "apiNotAvailableRaise";

// `class X extends AbstractInputSuggest` or `extends obsidian.AbstractInputSuggest`:
// the class is defined when the module loads, so no runtime check guards it.
function isSuperClass(node: TSESTree.Node): boolean {
    const parent = node.parent;
    return (
        parent !== undefined &&
        (parent.type === AST_NODE_TYPES.ClassDeclaration || parent.type === AST_NODE_TYPES.ClassExpression) &&
        parent.superClass === node
    );
}

function featureKey(node: TSESTree.Node): string | undefined {
    switch (node.type) {
        case AST_NODE_TYPES.Identifier:
            return node.name;
        case AST_NODE_TYPES.ThisExpression:
            return "this";
        case AST_NODE_TYPES.Super:
            return "super";
        case AST_NODE_TYPES.ChainExpression:
        case AST_NODE_TYPES.TSNonNullExpression:
            return featureKey(node.expression);
        case AST_NODE_TYPES.NewExpression:
            return featureKey(node.callee);
        case AST_NODE_TYPES.MemberExpression: {
            const name = memberName(node);
            const object = featureKey(node.object);
            return name !== undefined && object !== undefined ? `${object}.${name}` : undefined;
        }
        default:
            return undefined;
    }
}

// Whether members proven to exist include `feature`: `x.m.n` existing proves
// `x.m` too.
function provesFeature(features: Set<string>, feature: string): boolean {
    return [...features].some((key) => key === feature || key.startsWith(`${feature}.`));
}

function memberName(node: TSESTree.MemberExpression): string | undefined {
    if (!node.computed) {
        return node.property.type === AST_NODE_TYPES.Identifier ? node.property.name : undefined;
    }
    return node.property.type === AST_NODE_TYPES.Literal && typeof node.property.value === "string"
        ? node.property.value
        : undefined;
}

// The members obsidianOverloadHistory.ts has an overload of.
const HISTORY_MEMBERS = new Set(Object.keys(OVERLOAD_HISTORY).map((key) => key.slice(0, key.indexOf("("))));

// The version an overload needs: its @since, or the first typings
// that had it, if those are older. A call that uses the result needs the first
// typings that also had its return type: `await workspace.duplicateLeaf(leaf)`
// resolved to nothing before 0.13.8. An overload the table does not list, as in
// typings newer than the table, keeps its @since.
function firstPublishedSince(
    qualifiedName: QualifiedName,
    declaration: ts.Declaration,
    since: Version,
    resultUsed: boolean,
): Version {
    if (!HISTORY_MEMBERS.has(qualifiedName) || !ts.isFunctionLike(declaration)) {
        return since;
    }
    const row = OVERLOAD_HISTORY[`${qualifiedName}${getOverloadKey(declaration)}`];
    const firstPublished = resultUsed ? (row?.resultFirstPublished ?? row?.firstPublished) : row?.firstPublished;
    return firstPublished && lt(firstPublished, since) ? firstPublished : since;
}

// A @since the rule can compare, or null: none, or one that is not a version.
function toSince(raw: string | null): Version | null {
    return (raw !== null && toVersion(raw)) || null;
}

// The lowest of the versions, or null, available from the start, when one of
// them is null or there are none.
function earliestOf(versions: (Version | null)[]): Version | null {
    let earliest: Version | null = null;
    for (const version of versions) {
        if (version === null) {
            return null;
        }
        if (earliest === null || lt(version, earliest)) {
            earliest = version;
        }
    }
    return earliest;
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

// An `if` that returns or throws, in a statement list: the statements after
// it, those that start at or after `end`, run only with `version` proven.
interface EarlyExit {
    end: number;
    version: Version | undefined;
    // The members, by featureKey, the exit proves to exist.
    features: Set<string>;
}

// The statements of a statement list, in order. Those that run before a child
// of the list are those that end before the child starts.
function getStatements(container: TSESTree.Node): TSESTree.Statement[] {
    switch (container.type) {
        case AST_NODE_TYPES.BlockStatement:
        case AST_NODE_TYPES.StaticBlock:
            return container.body;
        case AST_NODE_TYPES.Program:
            return container.body;
        case AST_NODE_TYPES.SwitchCase:
            return container.consequent;
        default:
            return [];
    }
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
    // Without a byte order mark, as TypeScript reads the file for the program,
    // so the positions here are those of the program's declarations.
    const content = readFileSync(dtsPath, "utf8").replace(/^\uFEFF/, "");
    const sourceFile = ts.createSourceFile(
        "obsidian.d.ts",
        content,
        ts.ScriptTarget.Latest,
        true,
    );

    visit(sourceFile);
    for (const [name, entry] of sinceMap) {
        if (entry.every(([, since]) => since === null)) {
            sinceMap.delete(name);
        }
    }

    if (obsidianVersion) {
        saveSinceMapCache(dtsPath, obsidianVersion, sinceMap);
    }

    cachedSinceMap = sinceMap;
    cachedDtsPath = dtsPath;
    return sinceMap;

    function visit(node: ts.Node): void {
        if (
            (ts.isClassDeclaration(node) ||
                ts.isInterfaceDeclaration(node) ||
                ts.isFunctionDeclaration(node) ||
                ts.isTypeAliasDeclaration(node) ||
                ts.isEnumDeclaration(node)) &&
            node.name
        ) {
            record(node.name.text, node);
            if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                visitMembers(node.name.text, node.members);
            }
        } else if (ts.isSourceFile(node) || ts.isModuleDeclaration(node) || ts.isModuleBlock(node)) {
            ts.forEachChild(node, visit);
        }
    }

    function visitMembers(
        parentName: string,
        members: ts.NodeArray<ts.Node>,
    ): void {
        for (const member of members) {
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
                record(`${parentName}.${memberName}`, member);
            }
        }
    }

    // Each declaration with @since, by its own JSDoc. An overload without one is
    // listed as null, so a call to it is not given a sibling's version; any
    // other declaration without one, such as an interface merged into a dated
    // class, adds nothing.
    function record(name: string, declaration: ts.Node): void {
        const since = getSinceTag(declaration) ?? null;
        if (
            since === null &&
            !ts.isFunctionDeclaration(declaration) &&
            !ts.isMethodDeclaration(declaration) &&
            !ts.isMethodSignature(declaration)
        ) {
            return;
        }
        const entry = sinceMap.get(name) ?? [];
        entry.push([declaration.pos, since]);
        sinceMap.set(name, entry);
    }
}

// Looked up once per program rather than once per file: a program can hold
// thousands of source files.
const dtsPaths = new WeakMap<ts.Program, string | undefined>();

function findObsidianDtsPath(program: ts.Program): string | undefined {
    if (dtsPaths.has(program)) {
        return dtsPaths.get(program);
    }
    let found: string | undefined;
    for (const sourceFile of program.getSourceFiles()) {
        const normalized = sourceFile.fileName.replace(/\\/g, "/");
        if (normalized.includes("/obsidian/obsidian.d.ts")) {
            found = sourceFile.fileName;
            break;
        }
    }
    dtsPaths.set(program, found);
    return found;
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
    if (isPluginAssignedMember(declaration)) {
        return true;
    }
    if (!ts.isInterfaceDeclaration(parent)) {
        return false;
    }
    return getPluginSuppliedTypes(declaration.getSourceFile()).has(parent.name.text);
}

// `Plugin.settings` (1.13) is a field the plugin assigns itself, "Assign loaded
// data here in onload", as plugins did long before Obsidian declared it, so
// reading it works on every version.
function isPluginAssignedMember(declaration: ts.Declaration): boolean {
    const parent = declaration.parent;
    return (
        (ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) &&
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "settings" &&
        (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent)) &&
        parent.name?.text === "Plugin"
    );
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
        if (
            cache.format === SINCE_MAP_FORMAT &&
            cache.obsidianPackageVersion === obsidianVersion &&
            cache.pluginVersion === PLUGIN_VERSION &&
            isSinceEntries(cache.entries)
        ) {
            return new Map(cache.entries);
        }

        return undefined;
    } catch {
        return undefined;
    }
}

// Entries in the shape the rule reads, so a damaged file is rebuilt rather than
// read wrong.
function isSinceEntries(entries: unknown): entries is [QualifiedName, SinceEntry][] {
    return (
        Array.isArray(entries) &&
        entries.every(
            (item: unknown) =>
                Array.isArray(item) &&
                typeof item[0] === "string" &&
                Array.isArray(item[1]) &&
                (item[1] as unknown[]).every(
                    (listed) =>
                        Array.isArray(listed) &&
                        typeof listed[0] === "number" &&
                        (listed[1] === null || typeof listed[1] === "string"),
                ),
        )
    );
}

function saveSinceMapCache(dtsPath: string, obsidianVersion: string, sinceMap: SinceMap): void {
    try {
        const cachePath = getCachePath(dtsPath);
        mkdirSync(dirname(cachePath), { recursive: true });
        const cache: SinceMapCache = {
            format: SINCE_MAP_FORMAT,
            obsidianPackageVersion: obsidianVersion,
            pluginVersion: PLUGIN_VERSION,
            entries: [...sinceMap.entries()],
        };
        writeFileSync(cachePath, JSON.stringify(cache), "utf8");
    } catch {
        // Non-critical. Caching is best-effort
    }
}
