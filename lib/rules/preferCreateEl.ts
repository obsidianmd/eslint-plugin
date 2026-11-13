import { ASTUtils, ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../minAppVersion.js";
import { API_SINCE, laterVersion } from "../obsidianApiVersions.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const TAG_SHORTHANDS: Record<string, string> = {
    div: "createDiv",
    span: "createSpan",
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// A replacement that calls one of Obsidian's global helpers by its bare name.
const BARE_HELPER_CALL = /^(createEl|createDiv|createSpan|createSvg|createFragment)(?:\?\.)?\(/;

// Obsidian's DOM helpers. Code in a function by one of these names is taken for
// an implementation of the helpers, such as a polyfill or a test fake, where
// the native method is the only one to call.
const HELPER_NAMES = new Set(["createEl", "createDiv", "createSpan", "createSvg", "createFragment"]);

// The helper for a tag argument that has one of its own: `createDiv` for
// `"div"`. An own key only, so that a tag such as `"constructor"` is not taken
// for one.
function getTagShorthand(tagArg: TSESTree.Node | undefined): string | undefined {
    const tagName = tagArg && getStringLiteralValue(tagArg);
    return tagName !== undefined && Object.hasOwn(TAG_SHORTHANDS, tagName) ? TAG_SHORTHANDS[tagName] : undefined;
}

// The methods this rule replaces, with the arguments it replaces them for.
// The first three are replaced on a document, which classifyDocumentTarget()
// decides; createEl() on any object, and called bare.
const REPLACED_METHODS: Record<string, (args: TSESTree.CallExpressionArgument[]) => boolean> = {
    // createElement(tag), not createElement(tag, options)
    createElement: (args) => args.length === 1,
    createElementNS: (args) => args.length >= 2 && getStringLiteralValue(args[0]) === SVG_NAMESPACE,
    createDocumentFragment: (args) => args.length === 0,
    // createEl("div", …) and createEl("span", …)
    createEl: (args) => getTagShorthand(args[0]) !== undefined,
};

// Whether `node` is `<object>.<method>(…)` with arguments this rule replaces
// the method for.
function isReplacedMethodCall(
    node: TSESTree.CallExpression,
    method: string,
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } {
    return (
        node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.property.name === method &&
        REPLACED_METHODS[method](node.arguments)
    );
}

/**
 * Whether this rule reports `call` when it is made on the global `document`,
 * as it then always does: `document.createElement(tag)`,
 * `document.createElementNS(svgNamespace, tag, …)`,
 * `document.createDocumentFragment()` and `document.createEl("div" | "span", …)`.
 * The replacement calls a global helper (`createEl(tag)`, `createDiv()`, …),
 * which leaves no `document` for prefer-active-doc to report. Inside an
 * implementation of the helpers themselves, such as a polyfill, this rule
 * reports nothing, so prefer-active-doc reports `document` there. Nor where
 * `minAppVersion` is known to be older than the helper, as `createSvg()`
 * (1.1.0) is for a plugin that supports 1.0.0.
 */
export function isReportedOnGlobalDocument(call: TSESTree.CallExpression, minAppVersion?: string): boolean {
    const method = Object.keys(REPLACED_METHODS).find((name) => isReplacedMethodCall(call, name));
    if (method === undefined || isInHelperImplementation(call)) {
        return false;
    }
    const helper =
        method === "createElementNS"
            ? "createSvg"
            : method === "createDocumentFragment"
              ? "createFragment"
              : getTagShorthand(call.arguments[0]);
    const since = helper === undefined ? undefined : HELPER_SINCE[helper];
    return since === undefined || supportsVersion(minAppVersion, since) !== false;
}

// Whether `node` is inside a function named after one of Obsidian's DOM
// helpers: `function createDiv() {}`, a method or property
// (`createSpan(o) { return this.createEl("span", o); }`,
// `{ createFragment: () => … }`), or a function assigned to one
// (`window.createDiv = …`, `Element.prototype.createEl = function () {}`,
// `Object.defineProperty(proto, "createEl", { value() {} })`). There the
// replacement could call the function it is in, or the polyfill being
// defined, and recurse forever.
export function isInHelperImplementation(node: TSESTree.Node): boolean {
    for (let current = node.parent; current; current = current.parent) {
        if (
            (current.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration ||
                current.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
                current.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression) &&
            getFunctionNames(current).some((name) => HELPER_NAMES.has(name))
        ) {
            return true;
        }
    }
    return false;
}

// The names a function goes by: its own, and that of the variable,
// property, method or member it is the value of.
function getFunctionNames(
    fn: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
): string[] {
    const names: string[] = [];
    if (fn.id) {
        names.push(fn.id.name);
    }
    let child: TSESTree.Node = fn;
    let parent = fn.parent;
    while (
        parent.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
        parent.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
        parent.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
        parent.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion
    ) {
        child = parent;
        parent = parent.parent;
    }
    const keyName = (key: TSESTree.Node, computed: boolean) =>
        !computed && key.type === TSESTree.AST_NODE_TYPES.Identifier ? key.name : getStringLiteralValue(key);
    let name: string | undefined;
    switch (parent.type) {
        case TSESTree.AST_NODE_TYPES.VariableDeclarator:
            if (parent.init === child && parent.id.type === TSESTree.AST_NODE_TYPES.Identifier) {
                name = parent.id.name;
            }
            break;
        case TSESTree.AST_NODE_TYPES.AssignmentExpression:
            if (parent.right === child) {
                name =
                    parent.left.type === TSESTree.AST_NODE_TYPES.Identifier
                        ? parent.left.name
                        : parent.left.type === TSESTree.AST_NODE_TYPES.MemberExpression
                            ? keyName(parent.left.property, parent.left.computed)
                            : undefined;
            }
            break;
        case TSESTree.AST_NODE_TYPES.MethodDefinition:
        case TSESTree.AST_NODE_TYPES.PropertyDefinition:
            name = keyName(parent.key, parent.computed);
            break;
        case TSESTree.AST_NODE_TYPES.Property:
            if (parent.value === child) {
                name = keyName(parent.key, parent.computed);
                const descriptorName = getDefinedPropertyName(parent);
                if (descriptorName !== undefined) {
                    names.push(descriptorName);
                }
            }
            break;
    }
    if (name !== undefined) {
        names.push(name);
    }
    return names;
}

// For `value`, `get` or `set` in the descriptor of
// `Object.defineProperty(target, "name", { value: … })`, the property's name.
function getDefinedPropertyName(property: TSESTree.Property): string | undefined {
    const descriptor = property.parent;
    const call = descriptor.parent;
    if (
        call?.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        call.arguments[2] !== descriptor ||
        call.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        call.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        call.callee.property.name !== "defineProperty"
    ) {
        return undefined;
    }
    return getStringLiteralValue(call.arguments[1]);
}

function getStringLiteralValue(
    node: TSESTree.Node,
): string | undefined {
    if (
        node.type === TSESTree.AST_NODE_TYPES.Literal &&
        typeof node.value === "string"
    ) {
        return node.value;
    }
    return undefined;
}

// The version each helper a replacement calls needs (createEl() is in the
// first typings), and activeWindow and `doc.win` for the window prefixes.
const HELPER_SINCE: Readonly<Record<string, string>> = {
    createDiv: API_SINCE.createDiv,
    createSpan: API_SINCE.createSpan,
    createFragment: API_SINCE.createFragment,
    createSvg: API_SINCE.createSvg,
};

type MessageIds = "preferCreateEl" | "preferCreateElSuggestion" | "preferCreateElSuggestionSince";

export default ruleCreator<MinAppVersionOptions, MessageIds>({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.",
            url: docsUrl("prefer-create-el"),
            requiresTypeChecking: true,
        },
        schema: minAppVersionSchema,
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferCreateEl:
                "Use '{{replacement}}' instead of '{{original}}'.",
            preferCreateElSuggestion:
                "Replace '{{original}}' with '{{replacement}}'.",
            preferCreateElSuggestionSince:
                "Replace '{{original}}' with '{{replacement}}' (needs Obsidian {{since}} or later).",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const minAppVersion = context.options[0]?.minAppVersion;
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function hasObsidianDomHelpers(node: TSESTree.Node): boolean {
            const type = services.getTypeAtLocation(node);
            return type.getProperty("createEl") !== undefined;
        }

        // Whether the document's `win` declares `helper`, so that
        // `doc.win.<helper>()` compiles.
        function winHasHelper(node: TSESTree.Node, helper: string): boolean {
            const type = getNonNullableTypeAt(node);
            const winSymbol = type.getProperty("win");
            if (winSymbol === undefined) {
                return false;
            }
            return checker.getTypeOfSymbol(winSymbol).getProperty(helper) !== undefined;
        }

        // The global `helper` a bare call at `node` would reach, if one is declared.
        function resolveGlobalHelper(node: TSESTree.Node, helper: string): ts.Symbol | undefined {
            return checker.resolveName(helper, services.esTreeNodeToTSNodeMap.get(node), ts.SymbolFlags.Value, false);
        }

        // Whether the call resolved to lib.dom's overload for a known tag name, the
        // one whose type parameter is `K extends keyof <tagMap>`. createEl() and
        // createSvg() accept exactly those names, so only then does the replacement
        // compile: a `string`, a custom element or a deprecated tag picks another
        // overload, and createEl(tag) fails with TS2345.
        function resolvesToTagMapOverload(node: TSESTree.CallExpression, tagMap: string): boolean {
            const signature = checker.getResolvedSignature(services.esTreeNodeToTSNodeMap.get(node));
            const typeParameter = signature?.getDeclaration()?.typeParameters?.[0];
            return typeParameter?.constraint?.getText() === `keyof ${tagMap}`;
        }

        // The type of `node` without null and undefined. A document that may be
        // null, or one read through an optional chain (`view?.doc` is typed
        // `Document | undefined` there), is still a document: the replacement
        // reads `win` from the same value with the same `.` or `?.`, so it
        // short-circuits or throws where the original call does. A call without
        // `?.` on a document that may be null is already TS18047 under
        // strictNullChecks, and `doc.win` keeps that error rather than adding one.
        function getNonNullableTypeAt(node: TSESTree.Node): ts.Type {
            return checker.getNonNullableType(services.getTypeAtLocation(node));
        }

        function isDocumentType(node: TSESTree.Node): boolean {
            const type = getNonNullableTypeAt(node);
            return (
                type.getProperty("defaultView") !== undefined &&
                type.getProperty("createElementNS") !== undefined &&
                type.getProperty("createDocumentFragment") !== undefined
            );
        }

        // Where the replacement is called, and whether `helper` is declared
        // there, which decides between a fix and a suggestion. `canAutofix`
        // returns undefined when the window the replacement is called on does
        // not declare `helper`: the call is then not reported.
        function classifyDocumentTarget(
            callee: TSESTree.MemberExpression,
        ): { prefix: string; since?: string; canAutofix: (helper: string) => boolean | undefined } | null {
            const obj = callee.object;
            if (isIframeDocument(obj)) {
                return null;
            }

            if (isGlobalDocument(obj)) {
                return {
                    prefix: "",
                    canAutofix: (helper) =>
                        hasObsidianDomHelpers(obj) && resolveGlobalHelper(callee, helper) !== undefined,
                };
            }

            const isActiveDoc =
                obj.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.name === "activeDocument";
            if (isActiveDoc) {
                // activeWindow is activeDocument.win, so the same check decides it:
                // obsidian.d.ts types both as a plain Window, which has no DOM
                // helpers, so activeWindow.createSpan() would not compile, and
                // the native call is the one that does.
                return {
                    prefix: "activeWindow.",
                    since: API_SINCE.activeWindow,
                    canAutofix: (helper) => winHasHelper(obj, helper) || undefined,
                };
            }

            if (isDocumentType(obj)) {
                // `doc?.createElement()` keeps its `?.`: `doc?.win.createEl()`.
                return {
                    prefix: `${getObjectText(obj)}${callee.optional ? "?." : "."}win.`,
                    since: API_SINCE["Node.win"],
                    canAutofix: (helper) => winHasHelper(obj, helper) || undefined,
                };
            }

            return null;
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (isInHelperImplementation(node)) {
                    return;
                }
                checkCreateElement(node);
                checkCreateElementNS(node);
                checkCreateElShorthand(node);
                checkCreateDocumentFragment(node);
            },
        };

        function checkCreateElement(node: TSESTree.CallExpression): void {
            if (!isReplacedMethodCall(node, "createElement")) {
                return;
            }

            const target = classifyDocumentTarget(node.callee);
            if (!target) {
                return;
            }

            const tagArg = node.arguments[0];
            const shorthand = getTagShorthand(tagArg);

            const canAutofix = target.canAutofix(shorthand ?? "createEl");
            if (canAutofix === undefined) {
                return;
            }
            const replacement = shorthand
                ? `${target.prefix}${shorthand}()`
                : `${target.prefix}createEl(${getText(tagArg)})`;
            const compiles = shorthand !== undefined || resolvesToTagMapOverload(node, "HTMLElementTagNameMap");
            report(node, replacement, compiles ? canAutofix : null, laterVersion(target.since, HELPER_SINCE[shorthand ?? "createEl"]));
        }

        function checkCreateElementNS(node: TSESTree.CallExpression): void {
            if (!isReplacedMethodCall(node, "createElementNS")) {
                return;
            }

            const target = classifyDocumentTarget(node.callee);
            if (!target) {
                return;
            }

            const canAutofix = target.canAutofix("createSvg");
            if (canAutofix === undefined) {
                return;
            }
            const tagArg = node.arguments[1];
            const remainingArgs = node.arguments.slice(2);
            const argsText = [getText(tagArg), ...remainingArgs.map((arg) => getText(arg))].join(", ");
            const replacement = `${target.prefix}createSvg(${argsText})`;
            const compiles = resolvesToTagMapOverload(node, "SVGElementTagNameMap");
            report(node, replacement, compiles ? canAutofix : null, laterVersion(target.since, HELPER_SINCE.createSvg));
        }

        function checkCreateElShorthand(node: TSESTree.CallExpression): void {
            let obj: TSESTree.Expression | undefined;
            let isDocGlobal = false;

            if (isReplacedMethodCall(node, "createEl")) {
                obj = node.callee.object;
                isDocGlobal = isGlobalDocument(obj);
            } else if (node.callee.type !== TSESTree.AST_NODE_TYPES.Identifier || node.callee.name !== "createEl") {
                return;
            }

            const shorthand = getTagShorthand(node.arguments[0]);
            if (!shorthand) {
                return;
            }

            // `el?.createEl("div")` keeps its `?.`: `el?.createDiv()`.
            const dot = node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression && node.callee.optional ? "?." : ".";
            const prefix = obj && !isDocGlobal ? getObjectText(obj) + dot : "";
            const remainingArgs = node.arguments.slice(1);
            const argsText = remainingArgs
                .map((arg) => getText(arg))
                .join(", ");
            const replacement = `${prefix}${shorthand}${node.optional ? "?.(" : "("}${argsText})`;

            report(node, replacement, checkShorthand(node, shorthand, isDocGlobal ? undefined : obj), HELPER_SINCE[shorthand]);
        }

        // Whether `createDiv(...)` or `el.createDiv(...)`, with the arguments
        // after the tag, compiles to what `createEl("div", ...)` returned: true
        // when the types say so, false when they cannot tell (a suggestion),
        // null when the replacement would not compile. Without types for the
        // call (an `any` receiver, or no declaration of the helpers at all) it
        // is fixed, as the replacement cannot fail where the original did not.
        function checkShorthand(
            node: TSESTree.CallExpression,
            helper: string,
            receiver: TSESTree.Expression | undefined,
        ): boolean | null {
            const callee = node.callee as TSESTree.Identifier | TSESTree.MemberExpression;
            let helperSymbol: ts.Symbol | undefined;
            if (receiver) {
                // `el?.createDiv()` and `el.createDiv()` read the helper from the
                // same value as the original, so null and undefined do not matter.
                const type = getNonNullableTypeAt(receiver);
                if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
                    return true;
                }
                // A type that declares only createEl(), such as a cast to
                // `{ createEl(...) }` or a polyfill's own `this`.
                helperSymbol = type.getProperty(helper);
                if (helperSymbol === undefined) {
                    return null;
                }
            } else {
                helperSymbol = resolveGlobalHelper(callee, helper);
                if (helperSymbol === undefined) {
                    // createEl() resolves, but no global helper is declared: a
                    // project's own typings, or a createEl imported from them.
                    return createElResolves(callee) ? null : true;
                }
                if (callee.type === TSESTree.AST_NODE_TYPES.Identifier && shadowsGlobalHelper(node, "createEl")) {
                    // The file's own createEl, such as an import: the global
                    // helper may not do what it does.
                    return false;
                }
            }
            const helperType = checker.getTypeOfSymbolAtLocation(helperSymbol, services.esTreeNodeToTSNodeMap.get(callee));
            return fitsSignature(node, helperType);
        }

        function createElResolves(callee: TSESTree.Identifier | TSESTree.MemberExpression): boolean {
            if (callee.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                return hasObsidianDomHelpers(callee.object);
            }
            return checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(callee)) !== undefined;
        }

        // Whether one of the helper's signatures takes the arguments after the
        // tag and returns the type the createEl() call had.
        function fitsSignature(node: TSESTree.CallExpression, helperType: ts.Type): boolean | null {
            const args = node.arguments.slice(1);
            if (
                typeof checker.isTypeAssignableTo !== "function" ||
                args.some((arg) => arg.type === TSESTree.AST_NODE_TYPES.SpreadElement)
            ) {
                return false;
            }
            const argTypes = args.map((arg) => services.getTypeAtLocation(arg));
            const call = services.esTreeNodeToTSNodeMap.get(node);
            // In an optional chain the signature's return type includes the
            // chain's `undefined`; the replacement keeps the chain, so compare
            // without it.
            const returnType = (type: ts.Type) => ts.isOptionalChain(call) ? checker.getNonNullableType(type) : type;
            const originalType = checker.getResolvedSignature(call)?.getReturnType();
            let unknown = false;
            for (const signature of helperType.getCallSignatures()) {
                const fits = signatureTakes(signature, argTypes);
                if (
                    fits === true &&
                    (isResultUnused(node) ||
                        (originalType && isSameType(returnType(signature.getReturnType()), returnType(originalType))))
                ) {
                    return true;
                }
                unknown ||= fits !== null;
            }
            return unknown ? false : null;
        }

        // true when every argument fits its parameter and the rest are
        // optional, null when they do not, false when the signature is generic
        // or has a rest parameter, which this does not work out.
        function signatureTakes(signature: ts.Signature, argTypes: ts.Type[]): boolean | null {
            const params = signature.getParameters();
            const declarations = params.map((param) => param.valueDeclaration);
            if (
                (signature.getTypeParameters()?.length ?? 0) > 0 ||
                declarations.some((declaration) => declaration === undefined || !ts.isParameter(declaration) || declaration.dotDotDotToken)
            ) {
                return false;
            }
            if (argTypes.length > params.length) {
                return null;
            }
            for (let i = 0; i < params.length; i++) {
                const declaration = declarations[i] as ts.ParameterDeclaration;
                if (i >= argTypes.length) {
                    if (!declaration.questionToken && !declaration.initializer) {
                        return null;
                    }
                } else if (!checker.isTypeAssignableTo(argTypes[i], checker.getTypeOfSymbol(params[i]))) {
                    return null;
                }
            }
            return true;
        }

        function isSameType(a: ts.Type, b: ts.Type): boolean {
            return a === b || (checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a));
        }

        function isResultUnused(node: TSESTree.CallExpression): boolean {
            const parent = node.parent.type === TSESTree.AST_NODE_TYPES.ChainExpression ? node.parent.parent : node.parent;
            return parent.type === TSESTree.AST_NODE_TYPES.ExpressionStatement;
        }

        function checkCreateDocumentFragment(node: TSESTree.CallExpression): void {
            if (!isReplacedMethodCall(node, "createDocumentFragment")) {
                return;
            }

            const target = classifyDocumentTarget(node.callee);
            if (!target) {
                return;
            }

            const canAutofix = target.canAutofix("createFragment");
            if (canAutofix === undefined) {
                return;
            }
            const replacement = `${target.prefix}createFragment()`;
            report(node, replacement, canAutofix, laterVersion(target.since, HELPER_SINCE.createFragment));
        }

        // Whether `name`, called bare at `node`, resolves to a binding of the
        // file's own -- a function, variable, parameter, class or import -- rather
        // than to Obsidian's global helper. Inside `function createDiv() { ... }`
        // the replacement `createDiv()` would call the enclosing function. Methods
        // and object keys are not bindings, and an ambient declaration (`declare
        // function createDiv(): HTMLDivElement;`) has no body, so the call still
        // reaches the global. (`declare global { ... }` gets a scope of its own that
        // no call is inside of, so it is never found here.)
        function shadowsGlobalHelper(node: TSESTree.Node, name: string): boolean {
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), name);
            return variable !== null && variable.defs.some((def) => !isAmbient(def.node));
        }

        function isAmbient(node: TSESTree.Node): boolean {
            for (let current: TSESTree.Node | undefined = node; current; current = current.parent) {
                if (
                    (current.type === TSESTree.AST_NODE_TYPES.TSDeclareFunction ||
                        current.type === TSESTree.AST_NODE_TYPES.VariableDeclaration ||
                        current.type === TSESTree.AST_NODE_TYPES.ClassDeclaration ||
                        current.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration) &&
                    current.declare
                ) {
                    return true;
                }
            }
            return false;
        }

        // `canAutofix` is null when the replacement would not compile at all: the
        // finding is reported without a fix or a suggestion.
        //
        // `since` is the Obsidian version the replacement needs. Below the
        // plugin's minAppVersion the native call is the right one, so it is
        // not reported; where no version is known, the replacement is offered
        // as before, and a suggestion says which version it needs.
        function report(
            node: TSESTree.CallExpression,
            replacement: string,
            canAutofix: boolean | null,
            since?: string,
        ): void {
            const supported = since === undefined ? true : supportsVersion(minAppVersion, since);
            if (supported === false) {
                return;
            }
            const original = getText(node);
            const bareHelper = BARE_HELPER_CALL.exec(replacement)?.[1];
            if (bareHelper !== undefined && shadowsGlobalHelper(node, bareHelper)) {
                // The bare call would reach the local binding instead.
                canAutofix = null;
            }
            if (canAutofix === null) {
                context.report({ node, messageId: "preferCreateEl", data: { replacement, original } });
                return;
            }
            context.report({
                node,
                messageId: "preferCreateEl",
                data: { replacement, original },
                ...(canAutofix
                    ? {
                        fix(fixer) {
                            return fixer.replaceText(node, replacement);
                        },
                    }
                    : {
                        suggest: [
                            {
                                messageId: supported === undefined
                                    ? "preferCreateElSuggestionSince" as const
                                    : "preferCreateElSuggestion" as const,
                                data: { replacement, original, since: since ?? "" },
                                fix(fixer) {
                                    return fixer.replaceText(node, replacement);
                                },
                            },
                        ],
                    }),
            });
        }

        // An iframe's document belongs to the iframe's own window, which Obsidian
        // never gives its DOM helpers: `doc.win.createEl()` throws there, so the
        // native method is the only way to create an element in that document.
        // Recognised: `x.contentDocument`, `x.contentWindow.document` (also with
        // `!`, `?.` or a type assertion), and a `const` holding either.
        function isIframeDocument(node: TSESTree.Node, seen = new Set<TSESTree.Node>()): boolean {
            const expr = unwrapExpression(node);
            if (expr.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                const name = getPropertyName(expr);
                if (name === "contentDocument") {
                    return true;
                }
                const owner = unwrapExpression(expr.object);
                return (
                    name === "document" &&
                    owner.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    getPropertyName(owner) === "contentWindow"
                );
            }
            if (expr.type !== TSESTree.AST_NODE_TYPES.Identifier || seen.has(expr)) {
                return false;
            }
            seen.add(expr);
            const variable = ASTUtils.findVariable(context.sourceCode.getScope(expr), expr);
            if (!variable || variable.defs.length !== 1) {
                return false;
            }
            const def = variable.defs[0];
            if (
                def.type !== "Variable" ||
                def.parent.kind !== "const" ||
                def.node.init === null
            ) {
                return false;
            }
            if (def.node.id.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return isIframeDocument(def.node.init, seen);
            }
            // `const { contentDocument } = iframe` or `{ contentDocument: doc }`
            return (
                def.node.id.type === TSESTree.AST_NODE_TYPES.ObjectPattern &&
                def.node.id.properties.some(
                    (property) =>
                        property.type === TSESTree.AST_NODE_TYPES.Property &&
                        property.value === def.name &&
                        getPropertyName(property) === "contentDocument",
                )
            );
        }

        function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
            let current = node;
            while (
                current.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                current.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                current.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
                current.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                current.type === TSESTree.AST_NODE_TYPES.ChainExpression
            ) {
                current = current.expression;
            }
            return current;
        }

        function getPropertyName(
            node: TSESTree.MemberExpression | TSESTree.Property,
        ): string | undefined {
            const key = node.type === TSESTree.AST_NODE_TYPES.MemberExpression ? node.property : node.key;
            if (!node.computed && key.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return key.name;
            }
            return node.computed ? getStringLiteralValue(key) : undefined;
        }

        function isGlobalDocument(node: TSESTree.Node): boolean {
            if (
                node.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.name !== "document"
            ) {
                return false;
            }

            const scope = context.sourceCode.getScope(node);
            const variable = findVariable(scope, node.name);
            return !variable || variable.defs.length === 0;
        }

        function findVariable(
            scope: ReturnType<typeof context.sourceCode.getScope>,
            name: string,
        ): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                // By name, rather than a search of each scope's variables.
                const variable = current.set.get(name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }

        function getText(node: TSESTree.Node): string {
            return context.sourceCode.getText(node);
        }

        // Returns the object's source text including any parentheses that
        // already surrounded it. A member base binding looser than `.` (e.g.
        // `cond ? a : b`) is always parenthesized in valid source, so preserving
        // the original grouping keeps `(cond ? a : b).win.createEl()` correct
        // without inventing new parentheses.
        function getObjectText(obj: TSESTree.Expression): string {
            const sourceCode = context.sourceCode;
            let start = obj.range[0];
            let end = obj.range[1];
            let before = sourceCode.getTokenBefore(obj);
            let after = sourceCode.getTokenAfter(obj);
            while (
                before !== null &&
                after !== null &&
                before.value === "(" &&
                after.value === ")"
            ) {
                start = before.range[0];
                end = after.range[1];
                before = sourceCode.getTokenBefore(before);
                after = sourceCode.getTokenAfter(after);
            }
            return sourceCode.getText().slice(start, end);
        }
    },
});
