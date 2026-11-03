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
            if (
                (found[0] !== typeAnnotation && isEmptyValue(node.expression)) ||
                (types && isAlreadyOfType(node, found, types))
            ) {
                return;
            }
            const name = typeName(found[0]);
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
        // not narrow it. A value of type any or unknown is not known to.
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
            return checker.isTypeAssignableTo(source, target);
        }

        return {
            // Catches `value as TFile`
            TSAsExpression: handler,
            // Catches `<TFile>value`
            TSTypeAssertion: handler,
        };
    },
});
