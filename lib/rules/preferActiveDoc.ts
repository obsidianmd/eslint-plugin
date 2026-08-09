import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const REPLACEMENTS: Record<string, string> = {
    document: "activeDocument",
};

const WINDOW_TIMER_METHODS = new Set([
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
]);

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer `activeDocument` over `document` for popout window compatibility.",
            url: docsUrl("prefer-active-doc"),
        },
        schema: [],
        fixable: undefined,
        messages: {
            preferActive:
                "Use '{{replacement}}' instead of '{{original}}' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            Identifier(node: TSESTree.Identifier) {
                if (!Object.hasOwn(REPLACEMENTS, node.name)) {
                    return;
                }

                const replacement = REPLACEMENTS[node.name];
                if (!replacement) {
                    return;
                }

                // Skip identifiers in type-level constructs (interfaces, type aliases, type annotations, etc.)
                if (isInTypeContext(node)) {
                    return;
                }

                // Skip if this is a property access (e.g., `obj.document`)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.property === node
                ) {
                    return;
                }

                // Skip if this is a property key in an object literal
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.key === node
                ) {
                    return;
                }

                // Skip if this is a declaration (variable, function param, etc.)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.id === node
                ) {
                    return;
                }

                // Skip typeof expressions (typeof window === 'undefined')
                if (node.parent.type === TSESTree.AST_NODE_TYPES.UnaryExpression && node.parent.operator === "typeof") {
                    return;
                }

                // Skip class property/method declarations (key position)
                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.PropertyDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.MethodDefinition) &&
                    node.parent.key === node
                ) {
                    return;
                }

                // Skip enum member names (but NOT initializers — enum initializers are runtime code)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.TSEnumMember &&
                    node.parent.id === node
                ) {
                    return;
                }

                // Skip labeled statements and break/continue label references
                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.LabeledStatement &&
                     node.parent.label === node) ||
                    ((node.parent.type === TSESTree.AST_NODE_TYPES.BreakStatement ||
                      node.parent.type === TSESTree.AST_NODE_TYPES.ContinueStatement) &&
                     node.parent.label === node)
                ) {
                    return;
                }

                // Skip window.setTimeout/clearTimeout/setInterval/clearInterval — timer functions should use window, not activeWindow
                if (
                    node.name === "window" &&
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.object === node &&
                    node.parent.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    WINDOW_TIMER_METHODS.has(node.parent.property.name)
                ) {
                    return;
                }

                // Check scope: only flag global references, not local variables named document/window
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                context.report({
                    node,
                    messageId: "preferActive",
                    data: {
                        original: node.name,
                        replacement,
                    },
                });
            },
        };

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
                    case TSESTree.AST_NODE_TYPES.TSModuleDeclaration:
                        return true;
                    default:
                        break;
                }
                current = current.parent;
            }
            return false;
        }
    },
});
