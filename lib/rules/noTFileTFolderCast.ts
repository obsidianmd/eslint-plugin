import { TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { getTypeInfo, type TypeInfo } from "../globalWindow.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_CAST_TYPES = new Set(["TFile", "TFolder"]);
const ARRAY_TYPES = new Set(["Array", "ReadonlyArray"]);

// The references to TFile or TFolder in an asserted type that say what the
// value is: the type itself, a member of a union, or the element type of an
// array, as in `TFile`, `TFile | null`, `TFolder[]`, `readonly TFile[]`,
// `Array<TFile>` or `TFile[] | undefined`.
function findCastTargets(type: TSESTree.TypeNode, found: TSESTree.TSTypeReference[]): void {
    switch (type.type) {
        case TSESTree.AST_NODE_TYPES.TSTypeReference: {
            if (type.typeName.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return;
            }
            const name = type.typeName.name;
            const params = type.typeArguments?.params ?? [];
            if (BANNED_CAST_TYPES.has(name) && params.length === 0) {
                found.push(type);
            } else if (ARRAY_TYPES.has(name) && params.length === 1) {
                findCastTargets(params[0], found);
            }
            return;
        }
        case TSESTree.AST_NODE_TYPES.TSUnionType:
            for (const member of type.types) {
                findCastTargets(member, found);
            }
            return;
        case TSESTree.AST_NODE_TYPES.TSArrayType:
            findCastTargets(type.elementType, found);
            return;
        case TSESTree.AST_NODE_TYPES.TSTypeOperator:
            if (type.operator === "readonly" && type.typeAnnotation) {
                findCastTargets(type.typeAnnotation, found);
            }
            return;
        default:
            return;
    }
}

function typeName(reference: TSESTree.TSTypeReference): string {
    return (reference.typeName as TSESTree.Identifier).name;
}

// `null as TFile | null`, `undefined as TFolder | undefined`, `[] as TFile[]`:
// a value that has the asserted type already, so nothing is narrowed.
function isEmptyValue(expression: TSESTree.Expression): boolean {
    return (
        (expression.type === TSESTree.AST_NODE_TYPES.Literal && expression.raw === "null") ||
        (expression.type === TSESTree.AST_NODE_TYPES.Identifier && expression.name === "undefined") ||
        (expression.type === TSESTree.AST_NODE_TYPES.ArrayExpression && expression.elements.length === 0)
    );
}

const UNKNOWN_TYPE = ts.TypeFlags.Any | ts.TypeFlags.Unknown;
const ARRAY_SEARCHES = new Set(["find", "findLast", "filter"]);

// `files.find((f) => f instanceof TFile && f.extension === "md") as TFile | undefined`
// and the same with `filter` and `TFile[]`: the callback keeps only values
// that are a `name`, by an `instanceof` the result must pass, but TypeScript
// infers no type predicate from an `&&` chain, so the assertion is how the
// result gets its type.
function isFoundByInstanceof(expression: TSESTree.Expression, name: string): boolean {
    const call = expression.type === TSESTree.AST_NODE_TYPES.ChainExpression ? expression.expression : expression;
    if (
        call.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
        call.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
        call.callee.computed ||
        call.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
        !ARRAY_SEARCHES.has(call.callee.property.name)
    ) {
        return false;
    }
    const callback = call.arguments[0];
    if (
        callback?.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
        callback?.type !== TSESTree.AST_NODE_TYPES.FunctionExpression
    ) {
        return false;
    }
    const param = callback.params[0];
    if (param?.type !== TSESTree.AST_NODE_TYPES.Identifier) {
        return false;
    }
    let returned: TSESTree.Node | null | undefined = callback.body;
    if (returned.type === TSESTree.AST_NODE_TYPES.BlockStatement) {
        const statements = returned.body;
        const last = statements.length === 1 ? statements[0] : undefined;
        returned = last?.type === TSESTree.AST_NODE_TYPES.ReturnStatement ? last.argument : undefined;
    }
    return returned ? conjuncts(returned).some((test) => isInstanceofTest(test, param.name, name)) : false;
}

// The operands of an `a && b && c` chain, or the expression itself.
function conjuncts(node: TSESTree.Node): TSESTree.Node[] {
    return node.type === TSESTree.AST_NODE_TYPES.LogicalExpression && node.operator === "&&"
        ? [...conjuncts(node.left), ...conjuncts(node.right)]
        : [node];
}

// `<param> instanceof <name>`.
function isInstanceofTest(node: TSESTree.Node, param: string, name: string): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.BinaryExpression &&
        node.operator === "instanceof" &&
        node.left.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.left.name === param &&
        node.right.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.right.name === name
    );
}

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.",
            url: docsUrl("no-tfile-tfolder-cast"),
        },
        schema: [],
        messages: {
            avoidCast:
                "Avoid casting to '{{typeName}}'. Use an 'instanceof {{typeName}}' check to safely narrow the type.",
        },
        // This rule is not auto-fixable because the correction requires
        // changing the code's control flow (e.g., adding an if-block),
        // which is too complex and potentially breaking for an auto-fix.
    },
    defaultOptions: [],
    create(context) {
        const types = getTypeInfo(context);

        // The handler for both TSAsExpression and TSTypeAssertion nodes.
        // It checks if the type being cast to is TFile or TFolder, a union
        // with one of them, or an array of them.
        const handler = (
            node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
        ) => {
            const typeAnnotation = node.typeAnnotation;
            const found: TSESTree.TSTypeReference[] = [];
            findCastTargets(typeAnnotation, found);
            if (found.length === 0) {
                return;
            }
            const names = new Set(found.map(typeName));
            // `TFile | TFolder` is what every TAbstractFile is.
            if (names.size > 1) {
                return;
            }
            const name = typeName(found[0]);
            if (
                (found[0] !== typeAnnotation && isEmptyValue(node.expression)) ||
                isFoundByInstanceof(node.expression, name) ||
                (types && isAlreadyOfType(node, found, types))
            ) {
                return;
            }
            context.report({
                node: found[0],
                messageId: "avoidCast",
                data: {
                    typeName: name,
                },
            });
        };

        // Whether the value has the asserted type already, as in
        // `vault.getFileByPath(path) as TFile | null`, so the assertion does
        // not narrow it to a TFile or a TFolder. That includes one that only
        // drops null and undefined, as in `vault.getFileByPath(path) as TFile`
        // or `files.filter(Boolean) as TFile[]` for `(TFile | null)[]`: the
        // value is a TFile already, and an instanceof check is not what the
        // hidden null calls for. A value of type any or unknown is not known
        // to.
        function isAlreadyOfType(
            node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
            found: TSESTree.TSTypeReference[],
            info: TypeInfo,
        ): boolean {
            const { checker } = info;
            if (typeof checker.isTypeAssignableTo !== "function") {
                return false;
            }
            // Without the obsidian types, TFile is an error type that every
            // value is assignable to.
            if (found.some((reference) => checker.getTypeAtLocation(info.toTs(reference)).flags & UNKNOWN_TYPE)) {
                return false;
            }
            const source = checker.getTypeAtLocation(info.toTs(node.expression));
            if (source.flags & UNKNOWN_TYPE) {
                return false;
            }
            const target = checker.getTypeAtLocation(info.toTs(node.typeAnnotation));
            if (checker.isTypeAssignableTo(source, target)) {
                return true;
            }
            const value = withoutNullish(checker, source);
            const asserted = withoutNullish(checker, target);
            if (value === undefined || asserted === undefined) {
                return false;
            }
            if (checker.isTypeAssignableTo(value, asserted)) {
                return true;
            }
            // `(TFile | null)[]` as `TFile[]`: compare the elements.
            const valueElement = arrayElement(checker, value);
            const assertedElement = arrayElement(checker, asserted);
            if (valueElement === undefined || assertedElement === undefined) {
                return false;
            }
            const element = withoutNullish(checker, valueElement);
            const assertedNonNull = withoutNullish(checker, assertedElement);
            return (
                element !== undefined &&
                assertedNonNull !== undefined &&
                checker.isTypeAssignableTo(element, assertedNonNull)
            );
        }

        // The type without null and undefined; undefined when nothing is
        // left, as for `null`, which is no file at all.
        function withoutNullish(checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined {
            const result = checker.getNonNullableType(type);
            return result.flags & ts.TypeFlags.Never ? undefined : result;
        }

        // The element type of an array or readonly array type.
        function arrayElement(checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined {
            const name = type.getSymbol()?.getName();
            if (name === undefined || !ARRAY_TYPES.has(name)) {
                return undefined;
            }
            return checker.getTypeArguments(type as ts.TypeReference)[0];
        }

        return {
            // Catches `value as TFile`
            TSAsExpression: handler,
            // Catches `<TFile>value`
            TSTypeAssertion: handler,
        };
    },
});
