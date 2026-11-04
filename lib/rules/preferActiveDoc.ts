import { TSESTree } from "@typescript-eslint/utils";
import { disableDirectives, isDisabled, problemStart } from "../disableDirectives.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";
import { isReportedOnGlobalDocument } from "./preferCreateEl.js";

// `window` is left alone: timers belong on the main window rather than on
// activeWindow (see prefer-window-timers), and so do many of its other uses.
const REPLACEMENTS: Record<string, string> = {
    document: "activeDocument",
};

// The files the recommended config runs prefer-create-el on, given type
// information: its `**/*.{ts,cts,mts,tsx}` block.
const TYPESCRIPT_FILE = /\.(?:ts|cts|mts|tsx)$/;

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
        // prefer-create-el needs type information, and the recommended config
        // runs it on TypeScript files only.
        const createElRuns =
            Boolean(context.sourceCode.parserServices?.program) &&
            TYPESCRIPT_FILE.test(context.filename);
        // prefer-create-el under the prefix this plugin is registered with.
        const createElId = context.id.replace(/prefer-active-doc$/, "prefer-create-el");

        // Whether a comment turns prefer-create-el off where it would report
        // `call`, so it reports nothing there. Turning it off in the config is
        // not visible to another rule.
        function createElDisabledAt(call: TSESTree.CallExpression): boolean {
            return isDisabled(
                disableDirectives(context.sourceCode),
                problemStart({ node: call, messageId: "preferActive" }),
                (ruleId) => ruleId === createElId,
            );
        }

        return {
            Identifier(node: TSESTree.Identifier) {
                if (!Object.hasOwn(REPLACEMENTS, node.name)) {
                    return;
                }

                const replacement = REPLACEMENTS[node.name];

                // Skip identifiers in type-level constructs (interfaces, type aliases, type annotations, etc.)
                if (isInTypeContext(node)) {
                    return;
                }

                // Skip if this is a property access (e.g., `obj.document`), but not a
                // computed one (`obj[document]` reads the global)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.property === node &&
                    !node.parent.computed
                ) {
                    return;
                }

                // Skip if this is a property key in an object literal, but not a
                // computed one (`{ [document]: 1 }` reads the global)
                if (
                    node.parent.type === TSESTree.AST_NODE_TYPES.Property &&
                    node.parent.key === node &&
                    !node.parent.computed
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

                // Skip class member names (key position), including abstract members and
                // accessors, but not computed keys (`[document]` reads the global)
                if (
                    (node.parent.type === TSESTree.AST_NODE_TYPES.PropertyDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.AccessorProperty ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractPropertyDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractMethodDefinition ||
                     node.parent.type === TSESTree.AST_NODE_TYPES.TSAbstractAccessorProperty) &&
                    node.parent.key === node &&
                    !node.parent.computed
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

                // Check scope: only flag global references, not local variables named document/window
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.name);
                if (variable && variable.defs.length > 0) {
                    return;
                }

                // Leave `document.createElement("p")` and the other calls
                // prefer-create-el reports to it: its createEl("p") drops
                // `document`, while activeDocument.createElement("p") would
                // still be reported by it. Where a comment disables
                // prefer-create-el for the call, report `document` as before.
                if (
                    createElRuns &&
                    node.parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                    node.parent.object === node &&
                    node.parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                    node.parent.parent.callee === node.parent &&
                    isReportedOnGlobalDocument(node.parent.parent) &&
                    !createElDisabledAt(node.parent.parent)
                ) {
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
                        return true;
                    // Only an ambient `declare module`/`declare namespace`/`declare global`
                    // is type-level; a plain `namespace Foo { ... }` body is runtime code.
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
    },
});
