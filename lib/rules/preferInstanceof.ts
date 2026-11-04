import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import type { ParserServices } from "@typescript-eslint/utils";
import ts from "typescript";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const INSTANCEABLE_BASE_TYPES = new Set(["Node", "UIEvent"]);

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

function isInstanceableType(type: ts.Type, services: ParserServices): boolean {
    type = withoutNullish(type);
    const constraint = type.getConstraint();

    if (constraint) {
        type = withoutNullish(constraint);
    }

    const symbol = type.getSymbol();
    if (symbol && INSTANCEABLE_BASE_TYPES.has(symbol.name)) {
        return true;
    }

    // A reference to a generic class, such as `DataEl<string>` or a base class
    // `DataEl<number>`, has no base types of its own; the class it refers to
    // has. Before TypeScript 5.1, so is the constraint of `this` inside any class.
    const target = (type as Partial<ts.TypeReference>).target ?? type;
    const baseTypes = target.getBaseTypes();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (isInstanceableType(baseType, services)) {
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

                const leftType = services.getTypeAtLocation(node.left);
                if (!isInstanceableType(leftType, services)) {
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
