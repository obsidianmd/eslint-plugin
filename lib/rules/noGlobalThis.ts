import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import {
    getGlobalWindowType,
    getTypeInfo,
    isGlobalWindowAt,
    isResultDiscarded,
    isTimerCallTypeSafe,
    isWindowCheck,
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
                const rewrite = classify(node);
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
            const parent = node.parent;

            // `"window" in globalThis`: as `window`, the check would throw
            // where it is false.
            if (isWindowCheck(parent)) {
                return "none";
            }

            // globalThis.x, globalThis["x"]
            if (parent.type === TSESTree.AST_NODE_TYPES.MemberExpression && parent.object === node) {
                // typeof globalThis.document, the same check
                const outer =
                    parent.parent.type === TSESTree.AST_NODE_TYPES.ChainExpression ? parent.parent.parent : parent.parent;
                if (isWindowCheck(outer)) {
                    return "none";
                }
                const name = staticPropertyName(parent);
                if (name === null) {
                    return "suggest";
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
                const variable = current.variables.find((v) => v.name === name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
    },
});
