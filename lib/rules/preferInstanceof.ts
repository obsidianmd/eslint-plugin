import { ESLintUtils, type TSESLint, TSESTree } from "@typescript-eslint/utils";
import type { ParserServices } from "@typescript-eslint/utils";
import ts from "typescript";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const INSTANCEABLE_BASE_TYPES = new Set(["Node", "UIEvent"]);

// The names that hold the main or the active window, or the global object.
const GLOBAL_WINDOW_NAMES = new Set(["window", "activeWindow", "globalThis", "global", "self"]);

type Scope = ReturnType<TSESLint.RuleContext<string, readonly unknown[]>["sourceCode"]["getScope"]>;
type Variable = NonNullable<ReturnType<Scope["set"]["get"]>>;

const NULLISH_FLAGS = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

// `T | null` and `T | undefined` as `T`: with strictNullChecks a value that may
// be null or undefined has a union type, which has no symbol or base types of
// its own. A union of anything else, such as `Node | string`, stays a union.
function withoutNullish(type: ts.Type): ts.Type {
    if (!type.isUnion()) {
        return type;
    }
    const rest = type.types.filter((part) => (part.flags & NULLISH_FLAGS) === 0);
    return rest.length === 1 ? rest[0] : type;
}

// The DOM's own `Node` or `UIEvent`, from TypeScript's lib.dom.d.ts, which
// Obsidian's typings add instanceOf() to. Not another type of that name, such
// as React's synthetic `UIEvent` or unist's `Node`, which have no instanceOf().
function isDeclaredInDefaultLib(symbol: ts.Symbol, services: ParserServices): boolean {
    const program = services.program;
    return (
        !!program &&
        (symbol.declarations ?? []).some((declaration) => program.isSourceFileDefaultLibrary(declaration.getSourceFile()))
    );
}

function isInstanceableType(type: ts.Type, services: ParserServices): boolean {
    return extendsLibType(type, INSTANCEABLE_BASE_TYPES, services);
}

// Whether `type` is, or extends, one of the lib.dom.d.ts types named in `names`.
function extendsLibType(type: ts.Type, names: ReadonlySet<string>, services: ParserServices): boolean {
    type = withoutNullish(type);
    const constraint = type.getConstraint();

    if (constraint) {
        type = withoutNullish(constraint);
    }

    const symbol = type.getSymbol();
    if (symbol && names.has(symbol.name) && isDeclaredInDefaultLib(symbol, services)) {
        return true;
    }

    // A reference to a generic class, such as `DataEl<string>` or a base class
    // `DataEl<number>`, has no base types of its own; the class it refers to
    // has. Before TypeScript 5.1, so is the constraint of `this` inside any class.
    const target = (type as Partial<ts.TypeReference>).target ?? type;
    const baseTypes = target.getBaseTypes();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (extendsLibType(baseType, names, services)) {
                return true;
            }
        }
    }

    return false;
}

// Operands that can be the object of `.instanceOf(...)` without parentheses.
// Anything else, such as `await el`, `el as Node` or `a ? b : c`, binds looser
// than member access and is wrapped: `(await el).instanceOf(HTMLElement)`.
const MEMBER_OBJECT_TYPES = new Set<TSESTree.AST_NODE_TYPES>([
    TSESTree.AST_NODE_TYPES.CallExpression,
    TSESTree.AST_NODE_TYPES.Identifier,
    TSESTree.AST_NODE_TYPES.MemberExpression,
    TSESTree.AST_NODE_TYPES.ThisExpression,
    TSESTree.AST_NODE_TYPES.TSNonNullExpression,
]);

function hasInstanceOfMethod(type: ts.Type): boolean {
    const property = type.getProperty("instanceOf");
    return property !== undefined;
}

// Aliases and `const` initializers followed when reading a declared type.
const MAX_DEPTH = 5;

const NODE_TYPE = new Set(["Node"]);
const EVENT_TARGET_TYPE = new Set(["EventTarget"]);

// The properties of an event that hold an EventTarget: a node, but also a
// window or anything else that dispatches events.
const EVENT_TARGET_PROPERTIES = new Set(["currentTarget", "relatedTarget", "srcElement", "target"]);

// Events whose target is always a node, never a window: the target of a
// `focus`, `blur` or plain `UIEvent` on `window` is the window, and
// `window.instanceOf` does not exist.
const NODE_TARGET_EVENTS = new Set([
    "CompositionEvent",
    "DragEvent",
    "InputEvent",
    "KeyboardEvent",
    "MouseEvent",
    "PointerEvent",
    "TouchEvent",
    "WheelEvent",
]);

const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.",
            url: docsUrl("prefer-instanceof"),
            requiresTypeChecking: true,
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferInstanceof:
                "Use '.instanceOf({{className}})' instead of 'instanceof {{className}}' for cross-window safe type checking.",
            preferInstanceofSuggestion:
                "Replace 'instanceof {{className}}' with '.instanceOf({{className}})'.",
            preferInstanceofOptionalSuggestion:
                "Replace 'instanceof {{className}}' with '?.instanceOf({{className}})', which is falsy for a null or undefined value.",
            preferInstanceofOnEventTarget:
                "'{{operand}} instanceof {{className}}' is false for a node of a popout window, which has its own '{{className}}'. Check the node with '.instanceOf({{className}})', which works in every window.",
            useTargetNode:
                "Replace with '{{object}}.targetNode?.instanceOf({{className}})', and read '{{object}}.target' as '{{object}}.targetNode', the same value typed as a Node, in the rest of the function.",
            castToNode:
                "Replace with '({{operand}} as Node | null)?.instanceOf({{className}})'.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            BinaryExpression(node: TSESTree.BinaryExpression) {
                if (node.operator !== "instanceof") {
                    return;
                }

                // `this instanceof type` in an instanceOf() polyfill is the
                // check itself: as `this.instanceOf(type)` it would recurse.
                if (isInInstanceOfImplementation(node)) {
                    return;
                }

                // `focus instanceof el.ownerDocument.defaultView!.HTMLElement`
                // checks against a window of the code's choosing, as
                // `.instanceOf()` does: already cross-window safe.
                if (readsFromOwnWindow(node.right, 0)) {
                    return;
                }

                const leftType = services.getTypeAtLocation(node.left);
                if (!isInstanceableType(leftType, services)) {
                    checkEventTarget(node, leftType);
                    return;
                }

                // `null instanceof HTMLElement` is false, but `null.instanceOf()`
                // throws. A value that may be null or undefined keeps that
                // check with `?.`, which only a suggestion offers.
                const nullable = mayBeNullish(node.left, leftType);
                const rightText = context.sourceCode.getText(node.right);
                // `a?.b?.instanceOf(T)` short-circuits like `(a?.b)?.instanceOf(T)`.
                const leftText = MEMBER_OBJECT_TYPES.has(node.left.type) ||
                    (nullable && node.left.type === TSESTree.AST_NODE_TYPES.ChainExpression)
                    ? context.sourceCode.getText(node.left)
                    : `(${context.sourceCode.getText(node.left)})`;
                // `a instanceof (b, C)` must not become two arguments.
                const argumentText = node.right.type === TSESTree.AST_NODE_TYPES.SequenceExpression
                    ? `(${rightText})`
                    : rightText;
                const replacement = `${leftText}${nullable ? "?." : "."}instanceOf(${argumentText})`;
                const canAutofix = hasInstanceOfMethod(leftType) && !nullable;

                context.report({
                    node,
                    messageId: "preferInstanceof",
                    data: {
                        className: argumentText,
                    },
                    ...(canAutofix
                        ? {
                            fix(fixer) {
                                return fixer.replaceText(node, replacement);
                            },
                        }
                        : {
                            suggest: [
                                {
                                    messageId: nullable
                                        ? "preferInstanceofOptionalSuggestion" as const
                                        : "preferInstanceofSuggestion" as const,
                                    data: { className: argumentText },
                                    fix(fixer) {
                                        return fixer.replaceText(node, replacement);
                                    },
                                },
                            ],
                        }),
                });
            },
        };

        // Whether `right` reads the constructor from a window object other than
        // the global ones: `doc.defaultView!.HTMLElement`, `el.win.MouseEvent`,
        // `win?.HTMLElement`. `window.HTMLElement` and
        // `activeWindow.HTMLElement` are the main or the active window's, not
        // necessarily the value's, so those are still reported.
        //
        // A `const` is followed to its initializer, as in
        // `const Ctor = el.ownerDocument.defaultView?.HTMLElement;`, and so is
        // the left of `??` or `||`, as in `doc.defaultView?.HTMLElement ?? HTMLElement`.
        function readsFromOwnWindow(right: TSESTree.Node, depth: number): boolean {
            let member: TSESTree.Node = right;
            while (
                member.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                member.type === TSESTree.AST_NODE_TYPES.ChainExpression
            ) {
                member = member.expression;
            }
            if (
                member.type === TSESTree.AST_NODE_TYPES.LogicalExpression &&
                (member.operator === "??" || member.operator === "||")
            ) {
                return readsFromOwnWindow(member.left, depth);
            }
            if (member.type === TSESTree.AST_NODE_TYPES.Identifier) {
                const init = depth < MAX_DEPTH ? constInitializer(member) : undefined;
                return init !== undefined && readsFromOwnWindow(init, depth + 1);
            }
            if (member.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return false;
            }
            let object: TSESTree.Node = member.object;
            while (object.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression) {
                object = object.expression;
            }
            if (object.type === TSESTree.AST_NODE_TYPES.Identifier && GLOBAL_WINDOW_NAMES.has(object.name)) {
                return false;
            }
            const type = checker.getNonNullableType(services.getTypeAtLocation(object));
            const parts = type.isUnionOrIntersection() ? type.types : [type];
            return parts.some((part) => part.getSymbol()?.name === "Window");
        }

        // The initializer of the `const` that `id` reads, if it is one.
        function constInitializer(id: TSESTree.Identifier): TSESTree.Expression | undefined {
            const variable = findVariable(context.sourceCode.getScope(id), id.name);
            const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
            if (
                def?.node.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                def.parent?.type !== TSESTree.AST_NODE_TYPES.VariableDeclaration ||
                def.parent.kind !== "const" ||
                def.node.id !== def.name
            ) {
                return undefined;
            }
            return def.node.init ?? undefined;
        }

        function findVariable(scope: Scope | null, name: string): Variable | undefined {
            for (let current = scope; current; current = current.upper) {
                const variable = current.set.get(name);
                if (variable) {
                    return variable;
                }
            }
            return undefined;
        }

        // Whether `node` is in a function that implements instanceOf(): one
        // named so, a method or property of that name, a function assigned to
        // `*.instanceOf`, or the `value` of `Object.defineProperty(x, "instanceOf", …)`.
        function isInInstanceOfImplementation(node: TSESTree.Node): boolean {
            for (let current = node.parent; current; current = current.parent) {
                if (
                    current.type !== TSESTree.AST_NODE_TYPES.FunctionExpression &&
                    current.type !== TSESTree.AST_NODE_TYPES.FunctionDeclaration &&
                    current.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression
                ) {
                    continue;
                }
                if (current.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression && current.id?.name === "instanceOf") {
                    return true;
                }
                const parent = current.parent;
                if (
                    (parent?.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                        parent?.type === TSESTree.AST_NODE_TYPES.PropertyDefinition ||
                        parent?.type === TSESTree.AST_NODE_TYPES.Property) &&
                    keyName(parent.key, parent.computed) === "instanceOf"
                ) {
                    return true;
                }
                if (
                    parent?.type === TSESTree.AST_NODE_TYPES.AssignmentExpression &&
                    parent.right === current &&
                    parent.left.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    keyName(parent.left.property, parent.left.computed) === "instanceOf"
                ) {
                    return true;
                }
                // Object.defineProperty(proto, "instanceOf", { value: function … })
                if (
                    parent?.type === TSESTree.AST_NODE_TYPES.Property &&
                    keyName(parent.key, parent.computed) === "value" &&
                    parent.parent.type === TSESTree.AST_NODE_TYPES.ObjectExpression &&
                    parent.parent.parent?.type === TSESTree.AST_NODE_TYPES.CallExpression
                ) {
                    const key = parent.parent.parent.arguments[1];
                    if (key?.type === TSESTree.AST_NODE_TYPES.Literal && key.value === "instanceOf") {
                        return true;
                    }
                }
            }
            return false;
        }

        function keyName(key: TSESTree.Node, computed: boolean): string | undefined {
            if (!computed && key.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return key.name;
            }
            return key.type === TSESTree.AST_NODE_TYPES.Literal && typeof key.value === "string" ? key.value : undefined;
        }

        // `e.target instanceof HTMLElement`, where `e.target` is an
        // EventTarget: the node it holds belongs to the window it is in, so
        // the check is false in a popout. Reported only for a DOM Node class
        // on the right, never fixed: the event's target may not be a Node at
        // all, and the check narrows `e.target` for the code after it.
        function checkEventTarget(node: TSESTree.BinaryExpression, leftType: ts.Type): void {
            const left = node.left;
            if (
                left.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                left.computed ||
                left.optional ||
                left.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                !EVENT_TARGET_PROPERTIES.has(left.property.name) ||
                !isEventTargetType(leftType)
            ) {
                return;
            }
            const nodeClass = constructedNodeType(node.right);
            if (!nodeClass) {
                return;
            }
            const property = left.property.name;
            const operand = context.sourceCode.getText(left);
            // `e.target instanceof Element || (e.target as Node)?.instanceOf?.(Element)`
            // already checks across windows.
            if (
                node.parent.type === TSESTree.AST_NODE_TYPES.LogicalExpression &&
                node.parent.operator === "||" &&
                callsInstanceOfOn(node.parent.left === node ? node.parent.right : node.parent.left, operand)
            ) {
                return;
            }
            const rightText = context.sourceCode.getText(node.right);
            const className = node.right.type === TSESTree.AST_NODE_TYPES.SequenceExpression ? `(${rightText})` : rightText;
            const objectText = context.sourceCode.getText(left.object);
            const suggest: {
                messageId: "useTargetNode" | "castToNode";
                data: Record<string, string>;
                fix: TSESLint.ReportFixFunction;
            }[] = [];
            // `e.targetNode?.instanceOf(C)` is `boolean | undefined`, so only
            // where the result is a condition.
            if (hasInstanceOfMethod(nodeClass) && isOnlyTested(node)) {
                const targetNodeFix = property === "target" ? targetNodeRewrite(node, left) : undefined;
                if (targetNodeFix) {
                    suggest.push({
                        messageId: "useTargetNode",
                        data: { object: objectText, className },
                        fix: (fixer) => [
                            fixer.replaceText(node, `${objectText}.targetNode?.instanceOf(${className})`),
                            ...targetNodeFix.map((reference) => fixer.replaceText(reference, "targetNode")),
                        ],
                    });
                } else if (property === "relatedTarget" && !isNarrowedElsewhere(node, left, leftType)) {
                    suggest.push({
                        messageId: "castToNode",
                        data: { operand, className },
                        fix: (fixer) => fixer.replaceText(node, `(${operand} as Node | null)?.instanceOf(${className})`),
                    });
                }
            }
            context.report({
                node,
                messageId: "preferInstanceofOnEventTarget",
                data: { operand, className },
                suggest,
            });
        }

        // Whether `expression` calls `.instanceOf()` on `operand`, written
        // the same way, through casts and `?.`.
        function callsInstanceOfOn(expression: TSESTree.Node, operand: string): boolean {
            let call: TSESTree.Node = expression;
            if (call.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                call = call.expression;
            }
            if (
                call.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
                call.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                keyName(call.callee.property, call.callee.computed) !== "instanceOf"
            ) {
                return false;
            }
            let object: TSESTree.Node = call.callee.object;
            while (
                object.type === TSESTree.AST_NODE_TYPES.TSAsExpression ||
                object.type === TSESTree.AST_NODE_TYPES.TSTypeAssertion ||
                object.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression
            ) {
                object = object.expression;
            }
            return context.sourceCode.getText(object) === operand;
        }

        function isEventTargetType(type: ts.Type): boolean {
            const symbol = withoutNullish(type).getSymbol();
            return symbol !== undefined && EVENT_TARGET_TYPE.has(symbol.name) && isDeclaredInDefaultLib(symbol, services);
        }

        // The instances `right` constructs, if they are DOM Nodes:
        // `HTMLElement`, `Element`, `Text`, `SVGElement`.
        function constructedNodeType(right: TSESTree.Expression): ts.Type | undefined {
            const signatures = services.getTypeAtLocation(right).getConstructSignatures();
            const instance = signatures[0]?.getReturnType();
            return instance && extendsLibType(instance, NODE_TYPE, services) ? instance : undefined;
        }

        // Whether the value of `node` is only tested: the condition of an `if`,
        // loop or `?:`, or the operand of `!`, also through `&&` and `||`.
        function isOnlyTested(node: TSESTree.Node): boolean {
            let child: TSESTree.Node = node;
            let parent = child.parent;
            while (parent) {
                switch (parent.type) {
                    case TSESTree.AST_NODE_TYPES.LogicalExpression:
                        if (parent.operator === "??") {
                            return false;
                        }
                        break;
                    case TSESTree.AST_NODE_TYPES.UnaryExpression:
                        return parent.operator === "!";
                    case TSESTree.AST_NODE_TYPES.IfStatement:
                    case TSESTree.AST_NODE_TYPES.WhileStatement:
                    case TSESTree.AST_NODE_TYPES.DoWhileStatement:
                    case TSESTree.AST_NODE_TYPES.ForStatement:
                    case TSESTree.AST_NODE_TYPES.ConditionalExpression:
                        return parent.test === child;
                    default:
                        return false;
                }
                child = parent;
                parent = child.parent;
            }
            return false;
        }

        // For `e.target instanceof C` on an event whose target is always a
        // node, and that has Obsidian's `targetNode`: the other reads of
        // `e.target` to rewrite as `e.targetNode`. `targetNode` returns
        // `target` itself, typed as `Node | null`, so the rewrite keeps every
        // value, and the check narrows `e.targetNode` where it narrowed
        // `e.target`. Undefined where that cannot be shown.
        function targetNodeRewrite(
            node: TSESTree.BinaryExpression,
            left: TSESTree.MemberExpression,
        ): TSESTree.Identifier[] | undefined {
            const object = left.object;
            if (object.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return undefined;
            }
            const eventType = withoutNullish(services.getTypeAtLocation(object));
            if (
                !extendsLibType(eventType, NODE_TARGET_EVENTS, services) ||
                eventType.getProperty("targetNode") === undefined
            ) {
                return undefined;
            }
            const variable = findVariable(context.sourceCode.getScope(object), object.name);
            if (!variable || variable.defs.length !== 1) {
                return undefined;
            }
            const properties: TSESTree.Identifier[] = [];
            for (const reference of variable.references) {
                const id = reference.identifier;
                if (reference.isWrite()) {
                    return undefined;
                }
                const member = id.parent;
                if (member?.type !== TSESTree.AST_NODE_TYPES.MemberExpression || member.object !== id) {
                    continue;
                }
                const name = member.computed
                    ? keyName(member.property, true)
                    : member.property.type === TSESTree.AST_NODE_TYPES.Identifier
                      ? member.property.name
                      : undefined;
                if (name !== "target") {
                    continue;
                }
                if (member === left) {
                    continue;
                }
                if (
                    member.computed ||
                    member.optional ||
                    (member.range[0] >= node.range[0] && member.range[1] <= node.range[1]) ||
                    !keepsItsTypeAsNode(member)
                ) {
                    return undefined;
                }
                properties.push(member.property as TSESTree.Identifier);
            }
            return properties;
        }

        // Whether a read of `e.target` still compiles as `e.targetNode`, a
        // `Node | null`: not where it is written, kept in a `let` that may
        // be given another EventTarget, compared to a value that may be a
        // window, or checked against a class that is not a Node.
        function keepsItsTypeAsNode(member: TSESTree.MemberExpression): boolean {
            let current: TSESTree.Node = member;
            let parent: TSESTree.Node | undefined = current.parent;
            while (
                parent?.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression ||
                parent?.type === TSESTree.AST_NODE_TYPES.ChainExpression
            ) {
                current = parent;
                parent = current.parent;
            }
            switch (parent?.type) {
                case TSESTree.AST_NODE_TYPES.AssignmentExpression:
                    return parent.left !== current;
                case TSESTree.AST_NODE_TYPES.UpdateExpression:
                    return false;
                case TSESTree.AST_NODE_TYPES.UnaryExpression:
                    return parent.operator !== "delete";
                case TSESTree.AST_NODE_TYPES.VariableDeclarator:
                    return parent.parent.kind === "const" || parent.id.typeAnnotation !== undefined;
                case TSESTree.AST_NODE_TYPES.BinaryExpression: {
                    if (EQUALITY_OPERATORS.has(parent.operator)) {
                        const other = parent.left === current ? parent.right : parent.left;
                        return (
                            (other.type === TSESTree.AST_NODE_TYPES.Literal && other.value === null) ||
                            (other.type === TSESTree.AST_NODE_TYPES.Identifier && other.name === "undefined")
                        );
                    }
                    if (parent.operator === "instanceof" && parent.left === current) {
                        return constructedNodeType(parent.right) !== undefined;
                    }
                    return true;
                }
                default:
                    return true;
            }
        }

        // Whether another read of the same `e.relatedTarget` has a type the
        // check gave it, as in `e.relatedTarget instanceof Node && el.contains(e.relatedTarget)`.
        // Rewritten with a cast, the check would no longer narrow it.
        function isNarrowedElsewhere(
            node: TSESTree.BinaryExpression,
            left: TSESTree.MemberExpression,
            leftType: ts.Type,
        ): boolean {
            const object = left.object;
            if (object.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return true;
            }
            const variable = findVariable(context.sourceCode.getScope(object), object.name);
            if (!variable) {
                return true;
            }
            const name = (left.property as TSESTree.Identifier).name;
            return variable.references.some((reference) => {
                const member = reference.identifier.parent;
                if (
                    member?.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    member === left ||
                    member.object !== reference.identifier ||
                    (member.computed ? keyName(member.property, true) : (member.property as TSESTree.Identifier).name) !== name
                ) {
                    return false;
                }
                return services.getTypeAtLocation(member) !== leftType;
            });
        }

        // Whether the left operand may be null or undefined when the check runs.
        function mayBeNullish(left: TSESTree.Expression, type: ts.Type): boolean {
            const node = services.esTreeNodeToTSNodeMap.get(left);
            // Without noUncheckedIndexedAccess, `list[0]` is typed as an element
            // even past the end of the list.
            if (isIndexSignatureAccess(node)) {
                return true;
            }
            // Only with strictNullChecks can a type include null or undefined.
            // This comes before the test below, which a union that already
            // includes null passes as if strictNullChecks were off.
            if (typeIncludesNullish(type)) {
                return true;
            }
            // Without strictNullChecks TypeScript leaves null and undefined out of
            // every type, so getNullableType() returns the type unchanged.
            if (checker.getNullableType(type, ts.TypeFlags.Null) !== type) {
                return false;
            }
            // The types cannot tell then, so read the declarations instead:
            // `const child = el.firstElementChild` is declared `Element | null`.
            return isDeclaredNullable(node, 0);
        }

        function typeIncludesNullish(type: ts.Type): boolean {
            const constraint = type.getConstraint() ?? type;
            const parts = constraint.isUnion() ? constraint.types : [constraint];
            return parts.some((part) => (part.flags & NULLISH_FLAGS) !== 0);
        }

        function isIndexSignatureAccess(node: ts.Node): boolean {
            if (ts.isPropertyAccessExpression(node)) {
                return checker.getSymbolAtLocation(node.name) === undefined;
            }
            return ts.isElementAccessExpression(node) && getAccessedProperty(node) === undefined;
        }

        // The declared property `obj["name"]` or `tuple[0]` reads, if any.
        function getAccessedProperty(node: ts.ElementAccessExpression): ts.Symbol | undefined {
            const key = checker.getTypeAtLocation(node.argumentExpression);
            if (!key.isStringLiteral() && !key.isNumberLiteral()) {
                return undefined;
            }
            return checker.getTypeAtLocation(node.expression).getProperty(String(key.value));
        }

        // Whether the declarations behind `node` say it may be null or undefined:
        // a type annotation with `null`, `undefined` or `void`, an optional
        // property or parameter, an optional chain or an index signature.
        function isDeclaredNullable(node: ts.Node, depth: number): boolean {
            if (depth > MAX_DEPTH) {
                return false;
            }
            if (ts.isParenthesizedExpression(node) || node.kind === ts.SyntaxKind.SatisfiesExpression) {
                return isDeclaredNullable((node as ts.ParenthesizedExpression).expression, depth);
            }
            if (ts.isNonNullExpression(node)) {
                return false;
            }
            if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
                return typeNodeIncludesNullish(node.type, depth);
            }
            if (ts.isOptionalChain(node)) {
                return true;
            }
            if (ts.isPropertyAccessExpression(node)) {
                const property = checker.getSymbolAtLocation(node.name);
                return property === undefined || declaresNullable(property, depth);
            }
            if (ts.isElementAccessExpression(node)) {
                const property = getAccessedProperty(node);
                return property === undefined || declaresNullable(property, depth);
            }
            if (ts.isCallExpression(node)) {
                const declaration = checker.getResolvedSignature(node)?.getDeclaration();
                return declaration?.type !== undefined && typeNodeIncludesNullish(declaration.type, depth);
            }
            if (ts.isIdentifier(node)) {
                return identifierIsDeclaredNullable(node, depth);
            }
            if (ts.isConditionalExpression(node)) {
                return isDeclaredNullable(node.whenTrue, depth) || isDeclaredNullable(node.whenFalse, depth);
            }
            if (ts.isBinaryExpression(node)) {
                switch (node.operatorToken.kind) {
                    case ts.SyntaxKind.AmpersandAmpersandToken:
                        return isDeclaredNullable(node.left, depth) || isDeclaredNullable(node.right, depth);
                    case ts.SyntaxKind.BarBarToken:
                    case ts.SyntaxKind.QuestionQuestionToken:
                    case ts.SyntaxKind.CommaToken:
                    case ts.SyntaxKind.EqualsToken:
                        return isDeclaredNullable(node.right, depth);
                }
            }
            return false;
        }

        function identifierIsDeclaredNullable(node: ts.Identifier, depth: number): boolean {
            let symbol = checker.getSymbolAtLocation(node);
            if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
                symbol = checker.getAliasedSymbol(symbol);
            }
            const declaration = symbol?.valueDeclaration;
            if (declaration === undefined) {
                return false;
            }
            if (ts.isVariableDeclaration(declaration)) {
                if (declaration.type) {
                    return typeNodeIncludesNullish(declaration.type, depth);
                }
                return declaration.initializer !== undefined && isDeclaredNullable(declaration.initializer, depth + 1);
            }
            if (ts.isParameter(declaration)) {
                return (
                    declaration.questionToken !== undefined ||
                    (declaration.type !== undefined && typeNodeIncludesNullish(declaration.type, depth))
                );
            }
            return false;
        }

        function declaresNullable(property: ts.Symbol, depth: number): boolean {
            return (property.declarations ?? []).some((declaration) => {
                if (
                    ts.isPropertySignature(declaration) ||
                    ts.isPropertyDeclaration(declaration) ||
                    ts.isParameter(declaration)
                ) {
                    return (
                        declaration.questionToken !== undefined ||
                        (declaration.type !== undefined && typeNodeIncludesNullish(declaration.type, depth))
                    );
                }
                if (ts.isGetAccessorDeclaration(declaration)) {
                    return declaration.type !== undefined && typeNodeIncludesNullish(declaration.type, depth);
                }
                return false;
            });
        }

        function typeNodeIncludesNullish(node: ts.TypeNode, depth: number): boolean {
            if (depth > MAX_DEPTH) {
                return false;
            }
            switch (node.kind) {
                case ts.SyntaxKind.NullKeyword:
                case ts.SyntaxKind.UndefinedKeyword:
                case ts.SyntaxKind.VoidKeyword:
                    return true;
            }
            if (ts.isLiteralTypeNode(node)) {
                return node.literal.kind === ts.SyntaxKind.NullKeyword;
            }
            if (ts.isUnionTypeNode(node)) {
                return node.types.some((member) => typeNodeIncludesNullish(member, depth));
            }
            if (ts.isParenthesizedTypeNode(node)) {
                return typeNodeIncludesNullish(node.type, depth);
            }
            if (ts.isTypeReferenceNode(node)) {
                let symbol = checker.getSymbolAtLocation(node.typeName);
                if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
                    symbol = checker.getAliasedSymbol(symbol);
                }
                const alias = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
                return alias !== undefined && typeNodeIncludesNullish(alias.type, depth + 1);
            }
            return false;
        }
    },
});
