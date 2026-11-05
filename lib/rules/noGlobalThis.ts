import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import {
    followsProbeOfGlobal,
    getGlobalWindowType,
    getTypeInfo,
    isGlobalWindowAt,
    isInWindowCheck,
    isProbeOfGlobal,
    isResultDiscarded,
    isTimerCallTypeSafe,
    mayLackWindowAt,
    type TypeInfo,
} from "../globalWindow.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_GLOBALS = new Set(["global", "globalThis"]);

const TIMER_FUNCTIONS = new Set([
    "cancelAnimationFrame",
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);

// A cast to one of these has that type whatever is cast.
const CAST_KEEPS_TYPE = new Set<TSESTree.AST_NODE_TYPES>([
    TSESTree.AST_NODE_TYPES.TSAnyKeyword,
    TSESTree.AST_NODE_TYPES.TSUnknownKeyword,
    TSESTree.AST_NODE_TYPES.TSNeverKeyword,
]);

// The properties of the global object that are the window or its document.
const WINDOW_PROPERTIES = new Set(["window", "self", "globalThis", "top", "parent", "frames", "document"]);

// The calls that define properties on their first argument, and whether
// they name them in the second (`Object.defineProperty(globalThis, "x", …)`)
// or in the keys of the objects that follow (`Object.assign(globalThis, { x })`).
const DEFINING_CALLS: Record<string, Record<string, "key" | "objects">> = {
    Object: { defineProperty: "key", defineProperties: "objects", assign: "objects" },
    Reflect: { defineProperty: "key", set: "key", deleteProperty: "key" },
};

type Rewrite = "fix" | "suggest" | "none";

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow `global` and `globalThis`. Use `window` or `activeWindow` for popout window compatibility.",
            url: docsUrl("no-global-this"),
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            avoidGlobal:
                "Avoid using '{{name}}'. Use 'window' or 'activeWindow' for popout window compatibility.",
            useWindow: "Replace '{{name}}' with 'window'.",
        },
    },
    defaultOptions: [],
    create(context) {
        const types = getTypeInfo(context);
        // The globals this file declares, found once when needed (see declaredInFile).
        let fileGlobals: Set<string> | undefined;

        return {
            Identifier(node: TSESTree.Identifier) {
                if (!BANNED_GLOBALS.has(node.name)) {
                    return;
                }

                if (
                    isPropertyName(node) ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator && node.parent.id === node) ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") ||
                    (node.parent.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration) ||
                    isInTypeContext(node)
                ) {
                    return;
                }

                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                const data = { name: node.name };
                let rewrite = classify(node);
                // `typeof globalThis.crypto`, `"x" in globalThis`: written to work
                // where the property is missing, which as `window.x` throws
                // where there is no window. The same goes for a write, which
                // defines a global for code that may run without a window, and
                // for code that may run without one, such as the body of
                // `try { … } catch {}`, or the code a probe guards:
                // `if (globalThis.crypto?.randomUUID) globalThis.crypto.randomUUID()`.
                if (
                    rewrite === "fix" &&
                    (isProbeOfGlobal(node) ||
                        writesGlobal(node) ||
                        mayLackWindowAt(context, node) ||
                        followsProbeOfGlobal(context.sourceCode, node))
                ) {
                    rewrite = "suggest";
                }
                if (rewrite === "none") {
                    context.report({ node, messageId: "avoidGlobal", data });
                    return;
                }

                // `{ global }` is the key and the value at once: keep the key.
                const shorthand =
                    node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.shorthand &&
                    node.parent.value === node;
                const replacement = shorthand ? `${node.name}: window` : "window";
                const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(node, replacement);
                if (rewrite === "fix") {
                    context.report({ node, messageId: "avoidGlobal", data, fix });
                } else {
                    context.report({
                        node,
                        messageId: "avoidGlobal",
                        data,
                        suggest: [{ messageId: "useWindow", data, fix }],
                    });
                }
            },
        };

        // `window` has the type `Window & typeof globalThis`, so the rewrite can
        // change a type even though both are the same object at runtime. It is
        // fixed only where no type can change; elsewhere it is a suggestion. Where
        // `window` is not the global window, or `window.x` does not exist, it would
        // be wrong, and nothing is offered.
        function classify(node: TSESTree.Identifier): Rewrite {
            if (!isGlobalWindowAt(context, node)) {
                return "none";
            }
            // `"window" in globalThis`, `typeof globalThis["document"]`,
            // `!globalThis.window`: as `window`, the check would throw where
            // it is false.
            if (isInWindowCheck(node)) {
                return "none";
            }
            // `global.window = dom.window`, `const doc = globalThis.document`,
            // `Object.assign(global, { document })`: code that defines the
            // window or looks for it, where `window.window` would throw.
            if (definesOrReadsWindow(node)) {
                return "none";
            }
            const parent = node.parent;

            // globalThis.x, globalThis["x"]
            if (parent.type === TSESTree.AST_NODE_TYPES.MemberExpression && parent.object === node) {
                const name = staticPropertyName(parent);
                if (name === null) {
                    return "suggest";
                }
                // `global.DEFAULT_APP_KEY` with `declare global { var DEFAULT_APP_KEY: string }`:
                // a global only the project declares is often a bundler's
                // `define` key, which the bundler replaces by its exact text,
                // so `window.DEFAULT_APP_KEY` would be undefined at runtime.
                // A write defines the global rather than reading a define.
                if (!isWriteTarget(skipCastsUp(parent))) {
                    const projectOnly = types
                        ? isDeclaredOnlyByProject(types.checker.getTypeAtLocation(types.toTs(node)).getProperty(name))
                        : declaredInFile().has(name);
                    if (projectOnly) {
                        return "none";
                    }
                }
                if (types) {
                    return classifyMember(node, parent, name, types);
                }
                // Without type information only the timer functions are known
                // to exist on Window, and to keep their types in the same calls
                // that prefer-window-timers fixes.
                const call = parent.parent;
                return call.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    call.callee === parent &&
                    TIMER_FUNCTIONS.has(name) &&
                    isTimerCallTypeSafe(call, name, null)
                    ? "fix"
                    : "suggest";
            }

            // globalThis as any, <Foo>globalThis
            if (
                (parent.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                    parent.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion) &&
                parent.expression === node
            ) {
                if (CAST_KEEPS_TYPE.has(parent.typeAnnotation.type)) {
                    return "fix";
                }
                // The cast still compiles, and has the same type, when window
                // is assignable to it. `globalThis as Record<string, unknown>`
                // does not compile as `window as Record<string, unknown>`.
                return types && isWindowAssignableTo(node, parent.typeAnnotation, types) ? "fix" : "suggest";
            }

            // Object.assign(globalThis, …), Object.defineProperty(globalThis, …):
            // window is a subtype of typeof globalThis, so the argument still
            // fits, and the call's own type is not used.
            if (
                parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                parent.arguments.includes(node) &&
                isResultDiscarded(parent)
            ) {
                return "fix";
            }

            // "requestIdleCallback" in globalThis
            if (
                parent.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
                parent.operator === "in" &&
                parent.right === node
            ) {
                return "fix";
            }

            // Anything else, such as `const g = globalThis` or `{ globalThis }`,
            // takes on window's type.
            return "suggest";
        }

        // Whether every declaration of `property` is in the project's own
        // files: not in TypeScript's lib, nor in a package such as @types/node.
        function isDeclaredOnlyByProject(property: ts.Symbol | undefined): boolean {
            const program = context.sourceCode.parserServices?.program;
            const declarations = property?.declarations ?? [];
            return (
                !!program &&
                declarations.length > 0 &&
                declarations.every((declaration) => {
                    const file = declaration.getSourceFile();
                    return (
                        !program.isSourceFileDefaultLibrary(file) &&
                        !program.isSourceFileFromExternalLibrary(file) &&
                        !/[\\/]node_modules[\\/]/.test(file.fileName)
                    );
                })
            );
        }

        // Without type information: the globals this file declares,
        // `declare var X` at its top or `var X` in `declare global { … }`.
        function declaredInFile(): Set<string> {
            if (fileGlobals) {
                return fileGlobals;
            }
            const names = new Set<string>();
            const addAll = (statements: readonly TSESTree.Node[], ambient: boolean) => {
                for (let statement of statements) {
                    if (statement.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration && statement.declaration) {
                        statement = statement.declaration;
                    }
                    if (
                        statement.type === TSESTree.AST_NODE_TYPES.VariableDeclaration &&
                        (ambient || statement.declare)
                    ) {
                        for (const declarator of statement.declarations) {
                            if (declarator.id.type === TSESTree.AST_NODE_TYPES.Identifier) {
                                names.add(declarator.id.name);
                            }
                        }
                    } else if (
                        statement.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration &&
                        statement.kind === "global" &&
                        statement.body
                    ) {
                        addAll(statement.body.body, true);
                    }
                }
            };
            addAll(context.sourceCode.ast.body, false);
            fileGlobals = names;
            return names;
        }

        // Fixed when `window.<name>` has the type `<global>.<name>` had. Window
        // redeclares much of the global scope, so for many names its property is
        // an intersection of both declarations. For a function such as
        // `alert()` or `clearTimeout()` that only matters to the call's result.
        function classifyMember(
            node: TSESTree.Identifier,
            member: TSESTree.MemberExpression,
            name: string,
            info: TypeInfo,
        ): Rewrite {
            const { checker } = info;
            const windowType = getGlobalWindowType(info, node);
            if (!windowType || (windowType.flags & ts.TypeFlags.Any) !== 0) {
                // `declare var window: any`: anything compiles, but as `any`.
                return "suggest";
            }
            const windowProperty = windowType.getProperty(name);
            if (!windowProperty) {
                // `globalThis.MathJax` compiles without noImplicitAny;
                // `window.MathJax` does not.
                return "none";
            }
            const globalProperty = checker.getTypeAtLocation(info.toTs(node)).getProperty(name);
            if (!globalProperty) {
                return "suggest";
            }
            if (globalProperty === windowProperty) {
                // Window does not redeclare it: `global.process`, `globalThis.myGlobal`.
                return "fix";
            }
            const globalType = checker.getTypeOfSymbol(globalProperty);
            const windowPropertyType = checker.getTypeOfSymbol(windowProperty);
            if (globalType === windowPropertyType && !isWriteTarget(member)) {
                // `globalThis.document`, `globalThis.crypto`. A write could still
                // meet a property Window has as read-only.
                return "fix";
            }
            const call = member.parent;
            if (call.type === TSESTree.AST_NODE_TYPES.CallExpression && call.callee === member) {
                return isCallTypeSafe(call, globalType, windowPropertyType, info) ? "fix" : "suggest";
            }
            return "suggest";
        }

        // `window.f(…)` has every signature `globalThis.f` had, after Window's
        // own, so it still compiles, but may resolve to one of Window's: with
        // @types/node, `window.setTimeout()` returns a number rather than a
        // NodeJS.Timeout. Safe when the result is unused or every signature
        // returns the same type, and no callback takes its parameter types
        // from the signature.
        function isCallTypeSafe(
            call: TSESTree.CallExpression,
            globalType: ts.Type,
            windowPropertyType: ts.Type,
            info: TypeInfo,
        ): boolean {
            // `Window[f] & (typeof globalThis)[f]`, as lib.dom's
            // `declare var window: Window & typeof globalThis` makes it.
            if (!windowPropertyType.isIntersection() || !windowPropertyType.types.includes(globalType)) {
                return false;
            }
            const resolved = info.checker.getResolvedSignature(info.toTs(call) as ts.CallExpression);
            const signatures = windowPropertyType.getCallSignatures();
            if (!resolved) {
                return false;
            }
            const returnType = resolved.getReturnType();
            if (!isResultDiscarded(call) && !signatures.every((signature) => signature.getReturnType() === returnType)) {
                return false;
            }
            return call.arguments.every(
                (arg, index) =>
                    !hasUntypedParameter(arg) ||
                    signatures.every(
                        (signature) => parameterType(signature, index, info) === parameterType(resolved, index, info),
                    ),
            );
        }

        function parameterType(signature: ts.Signature, index: number, info: TypeInfo): ts.Type | undefined {
            const parameter = signature.getParameters()[index];
            return parameter ? info.checker.getTypeOfSymbol(parameter) : undefined;
        }

        function hasUntypedParameter(arg: TSESTree.CallExpressionArgument): boolean {
            return (
                (arg.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
                    arg.type === TSESTree.AST_NODE_TYPES.FunctionExpression) &&
                arg.params.some((param) => !("typeAnnotation" in param && param.typeAnnotation))
            );
        }

        function isWindowAssignableTo(node: TSESTree.Identifier, typeNode: TSESTree.TypeNode, info: TypeInfo): boolean {
            const windowType = getGlobalWindowType(info, node);
            if (!windowType || typeof info.checker.isTypeAssignableTo !== "function") {
                return false;
            }
            const target = info.checker.getTypeFromTypeNode(info.toTs(typeNode) as ts.TypeNode);
            return info.checker.isTypeAssignableTo(windowType, target);
        }

        // Whether `node` is the global object in `global.window = …`,
        // `delete globalThis.document`, `const w = globalThis.window`, or
        // `Object.defineProperty(globalThis, "window", …)`: a window property
        // written or read as a value, rather than read through as in
        // `globalThis.document.body`.
        function definesOrReadsWindow(node: TSESTree.Identifier): boolean {
            const member = propertyOf(node);
            if (member) {
                const name = staticPropertyName(member);
                return name !== null && WINDOW_PROPERTIES.has(name) && !isReadThrough(member);
            }
            const target = skipCastsUp(node);
            const call = target.parent;
            if (call?.type !== TSESTree.AST_NODE_TYPES.CallExpression || call.arguments[0] !== target) {
                return false;
            }
            const how = definingCall(call);
            if (how === "key") {
                const key = call.arguments[1];
                return key !== undefined && WINDOW_PROPERTIES.has(stringValue(key) ?? "");
            }
            return how === "objects" && call.arguments.slice(1).some(definesWindowKey);
        }

        // Whether `node` is the global object in a write: `globalThis.x = 1`,
        // `globalThis.count++`, `delete globalThis.x`, `[globalThis.x] = list`,
        // or an argument to a call, such as `Object.assign(globalThis, helpers)`.
        function writesGlobal(node: TSESTree.Identifier): boolean {
            const member = propertyOf(node);
            if (member) {
                return isWriteTarget(skipCastsUp(member));
            }
            const target = skipCastsUp(node);
            return (
                (target.parent?.type === TSESTree.AST_NODE_TYPES.CallExpression ||
                    target.parent?.type === TSESTree.AST_NODE_TYPES.NewExpression) &&
                target.parent.arguments.includes(target as TSESTree.Expression)
            );
        }

        // The member that reads a property of `node`, also through a cast or
        // `!`: `globalThis.x`, `(globalThis as any).x`, `globalThis!.x`.
        function propertyOf(node: TSESTree.Node): TSESTree.MemberExpression | null {
            const target = skipCastsUp(node);
            const parent = target.parent;
            return parent?.type === TSESTree.AST_NODE_TYPES.MemberExpression && parent.object === target ? parent : null;
        }

        // Whether `member` is only read through, so that it throws without a
        // window either way: `globalThis.document.body`, `globalThis.window.focus()`.
        function isReadThrough(member: TSESTree.MemberExpression): boolean {
            const target = skipCastsUp(member);
            const parent = target.parent;
            return (
                (parent?.type === TSESTree.AST_NODE_TYPES.MemberExpression && parent.object === target && !parent.optional) ||
                (parent?.type === TSESTree.AST_NODE_TYPES.CallExpression && parent.callee === target && !parent.optional)
            );
        }

        // `node`, or the cast or `!` around it: `globalThis as any`.
        function skipCastsUp(node: TSESTree.Node): TSESTree.Node {
            let current = node;
            for (let parent = current.parent; parent; parent = current.parent) {
                if (
                    (parent.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                        parent.type === TSESTree.AST_NODE_TYPES.TSSatisfiesExpression ||
                        parent.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
                        parent.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression) &&
                    parent.expression === current
                ) {
                    current = parent;
                } else {
                    break;
                }
            }
            return current;
        }

        function definingCall(call: TSESTree.CallExpression): "key" | "objects" | undefined {
            const callee = call.callee;
            if (
                callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                callee.object.type !== TSESTree.AST_NODE_TYPES.Identifier
            ) {
                return undefined;
            }
            const name = staticPropertyName(callee);
            const methods = Object.hasOwn(DEFINING_CALLS, callee.object.name) ? DEFINING_CALLS[callee.object.name] : undefined;
            return name !== null && methods && Object.hasOwn(methods, name) ? methods[name] : undefined;
        }

        // Whether `arg` is an object literal with a window property as a key:
        // `{ window: dom.window }`, `{ document }`.
        function definesWindowKey(arg: TSESTree.CallExpressionArgument): boolean {
            return (
                arg.type === TSESTree.AST_NODE_TYPES.ObjectExpression &&
                arg.properties.some((property) => {
                    if (property.type !== TSESTree.AST_NODE_TYPES.Property) {
                        return false;
                    }
                    const key = property.computed
                        ? stringValue(property.key)
                        : property.key.type === TSESTree.AST_NODE_TYPES.Identifier
                          ? property.key.name
                          : stringValue(property.key);
                    return key !== undefined && WINDOW_PROPERTIES.has(key);
                })
            );
        }

        function stringValue(node: TSESTree.Node): string | undefined {
            if (node.type === TSESTree.AST_NODE_TYPES.Literal) {
                return typeof node.value === "string" ? node.value : undefined;
            }
            if (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
                return node.quasis[0].value.cooked ?? undefined;
            }
            return undefined;
        }

        function staticPropertyName(member: TSESTree.MemberExpression): string | null {
            if (!member.computed) {
                return member.property.type === TSESTree.AST_NODE_TYPES.Identifier ? member.property.name : null;
            }
            return member.property.type === TSESTree.AST_NODE_TYPES.Literal && typeof member.property.value === "string"
                ? member.property.value
                : null;
        }

        function isWriteTarget(node: TSESTree.Node): boolean {
            const parent = node.parent;
            if (!parent) {
                return false;
            }
            switch (parent.type) {
                case TSESTree.AST_NODE_TYPES.AssignmentExpression:
                case TSESTree.AST_NODE_TYPES.AssignmentPattern:
                    return parent.left === node;
                case TSESTree.AST_NODE_TYPES.UpdateExpression:
                case TSESTree.AST_NODE_TYPES.RestElement:
                    return true;
                case TSESTree.AST_NODE_TYPES.UnaryExpression:
                    return parent.operator === "delete";
                case TSESTree.AST_NODE_TYPES.ForInStatement:
                case TSESTree.AST_NODE_TYPES.ForOfStatement:
                    return parent.left === node;
                case TSESTree.AST_NODE_TYPES.ArrayPattern:
                    return true;
                case TSESTree.AST_NODE_TYPES.Property:
                    return parent.value === node && parent.parent.type === TSESTree.AST_NODE_TYPES.ObjectPattern;
                default:
                    return false;
            }
        }

        // A name that is not a reference to the global: a non-computed property or
        // member key (`obj.global`, `{ global: 1 }`, a class field), or an
        // import/export name. Enum members are already bindings in their own scope.
        function isPropertyName(node: TSESTree.Identifier): boolean {
            const parent = node.parent;
            switch (parent.type) {
                case TSESTree.AST_NODE_TYPES.MemberExpression:
                    return parent.property === node && !parent.computed;
                case TSESTree.AST_NODE_TYPES.Property:
                case TSESTree.AST_NODE_TYPES.PropertyDefinition:
                case TSESTree.AST_NODE_TYPES.MethodDefinition:
                case TSESTree.AST_NODE_TYPES.AccessorProperty:
                case TSESTree.AST_NODE_TYPES.TSAbstractPropertyDefinition:
                case TSESTree.AST_NODE_TYPES.TSAbstractMethodDefinition:
                case TSESTree.AST_NODE_TYPES.TSAbstractAccessorProperty:
                    return parent.key === node && !parent.computed;
                case TSESTree.AST_NODE_TYPES.ImportSpecifier:
                    return parent.imported === node && parent.local !== node;
                case TSESTree.AST_NODE_TYPES.ExportSpecifier:
                    return parent.exported === node;
                default:
                    return false;
            }
        }

        // Types have no runtime effect, so popout windows do not apply: `typeof
        // globalThis` in an annotation, `{ global: boolean }` in a type literal or
        // interface, or anything inside an ambient `declare` block.
        function isInTypeContext(node: TSESTree.Node): boolean {
            let current: TSESTree.Node | undefined = node.parent;
            while (current) {
                switch (current.type) {
                    case TSESTree.AST_NODE_TYPES.TSTypeAnnotation:
                    case TSESTree.AST_NODE_TYPES.TSTypeQuery:
                    case TSESTree.AST_NODE_TYPES.TSQualifiedName:
                    case TSESTree.AST_NODE_TYPES.TSPropertySignature:
                    case TSESTree.AST_NODE_TYPES.TSMethodSignature:
                    case TSESTree.AST_NODE_TYPES.TSIndexSignature:
                    case TSESTree.AST_NODE_TYPES.TSTypeLiteral:
                    case TSESTree.AST_NODE_TYPES.TSInterfaceBody:
                    case TSESTree.AST_NODE_TYPES.TSInterfaceDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeAliasDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeReference:
                    case TSESTree.AST_NODE_TYPES.TSMappedType:
                    case TSESTree.AST_NODE_TYPES.TSConditionalType:
                    case TSESTree.AST_NODE_TYPES.TSTypeParameterDeclaration:
                    case TSESTree.AST_NODE_TYPES.TSTypeParameterInstantiation:
                        return true;
                    case TSESTree.AST_NODE_TYPES.TSModuleDeclaration:
                        if (current.declare) {
                            return true;
                        }
                        break;
                    default:
                        break;
                }
                current = current.parent;
            }
            return false;
        }

        function findVariable(scope: ReturnType<typeof context.sourceCode.getScope>, name: string): { defs: unknown[] } | null {
            let current: typeof scope | null = scope;
            while (current) {
                // By name, rather than a search of each scope's variables: the
                // global scope holds every name of TypeScript's lib.
                const variable = current.set.get(name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
