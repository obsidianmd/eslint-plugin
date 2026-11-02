import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_GLOBALS = new Set(["global", "globalThis"]);

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
        messages: {
            avoidGlobal:
                "Avoid using '{{name}}'. Use 'window' or 'activeWindow' for popout window compatibility.",
        },
    },
    defaultOptions: [],
    create(context) {
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

                context.report({
                    node,
                    messageId: "avoidGlobal",
                    data: { name: node.name },
                    fix(fixer) {
                        // `{ global }` is the key and the value at once: keep the key.
                        const shorthand =
                            node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                            node.parent.shorthand &&
                            node.parent.value === node;
                        return fixer.replaceText(node, shorthand ? `${node.name}: window` : "window");
                    },
                });
            },
        };

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
