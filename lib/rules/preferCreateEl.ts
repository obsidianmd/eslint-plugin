import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const TAG_SHORTHANDS: Record<string, string> = {
    div: "createDiv",
    span: "createSpan",
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.",
            url: docsUrl("prefer-create-el"),
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferCreateEl:
                "Use '{{replacement}}' instead of '{{original}}'.",
            preferCreateElSuggestion:
                "Replace '{{original}}' with '{{replacement}}'.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        function hasObsidianDomHelpers(node: TSESTree.Node): boolean {
            const type = services.getTypeAtLocation(node);
            return type.getProperty("createEl") !== undefined;
        }

        function isDocumentType(node: TSESTree.Node): boolean {
            const type = services.getTypeAtLocation(node);
            return (
                type.getProperty("defaultView") !== undefined &&
                type.getProperty("createElementNS") !== undefined &&
                type.getProperty("createDocumentFragment") !== undefined
            );
        }

        function classifyDocumentTarget(
            obj: TSESTree.Expression,
        ): { prefix: string; canAutofix: boolean } | null {
            if (isGlobalDocument(obj)) {
                return { prefix: "", canAutofix: hasObsidianDomHelpers(obj) };
            }

            const isActiveDoc =
                obj.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.name === "activeDocument";
            if (isActiveDoc) {
                return { prefix: "activeWindow.", canAutofix: true };
            }

            if (isDocumentType(obj)) {
                return {
                    prefix: `${getText(obj)}.win.`,
                    canAutofix: hasObsidianDomHelpers(obj),
                };
            }

            return null;
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                checkCreateElement(node);
                checkCreateElementNS(node);
                checkCreateElShorthand(node);
                checkCreateDocumentFragment(node);
            },
        };

        function checkCreateElement(node: TSESTree.CallExpression): void {
            if (
                node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createElement" ||
                node.arguments.length !== 1
            ) {
                return;
            }

            const target = classifyDocumentTarget(node.callee.object);
            if (!target) {
                return;
            }

            const tagArg = node.arguments[0];
            const tagName = getStringLiteralValue(tagArg);
            const shorthand = tagName ? TAG_SHORTHANDS[tagName] : undefined;

            const replacement = shorthand
                ? `${target.prefix}${shorthand}()`
                : `${target.prefix}createEl(${getText(tagArg)})`;
            report(node, replacement, target.canAutofix);
        }

        function checkCreateElementNS(node: TSESTree.CallExpression): void {
            if (
                node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createElementNS" ||
                node.arguments.length < 2
            ) {
                return;
            }

            const namespaceArg = node.arguments[0];
            const namespaceValue = getStringLiteralValue(namespaceArg);
            if (namespaceValue !== SVG_NAMESPACE) {
                return;
            }

            const target = classifyDocumentTarget(node.callee.object);
            if (!target) {
                return;
            }

            const tagArg = node.arguments[1];
            const remainingArgs = node.arguments.slice(2);
            const argsText = [getText(tagArg), ...remainingArgs.map((arg) => getText(arg))].join(", ");
            const replacement = `${target.prefix}createSvg(${argsText})`;

            report(node, replacement, target.canAutofix);
        }

        function checkCreateElShorthand(node: TSESTree.CallExpression): void {
            let obj: TSESTree.Expression | undefined;
            let isDocGlobal = false;

            if (node.callee.type === TSESTree.AST_NODE_TYPES.Identifier) {
                if (node.callee.name !== "createEl") {
                    return;
                }
            } else if (node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                if (
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "createEl"
                ) {
                    return;
                }
                obj = node.callee.object;
                isDocGlobal = isGlobalDocument(obj);
            } else {
                return;
            }

            if (node.arguments.length === 0) {
                return;
            }

            const tagArg = node.arguments[0];
            const tagName = getStringLiteralValue(tagArg);
            if (!tagName) {
                return;
            }

            const shorthand = TAG_SHORTHANDS[tagName];
            if (!shorthand) {
                return;
            }

            const prefix = obj && !isDocGlobal ? getText(obj) + "." : "";
            const remainingArgs = node.arguments.slice(1);
            const argsText = remainingArgs
                .map((arg) => getText(arg))
                .join(", ");
            const replacement = `${prefix}${shorthand}(${argsText})`;

            report(node, replacement, true);
        }

        function checkCreateDocumentFragment(node: TSESTree.CallExpression): void {
            if (
                node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createDocumentFragment" ||
                node.arguments.length !== 0
            ) {
                return;
            }

            const target = classifyDocumentTarget(node.callee.object);
            if (!target) {
                return;
            }

            const replacement = `${target.prefix}createFragment()`;
            report(node, replacement, target.canAutofix);
        }

        function report(node: TSESTree.CallExpression, replacement: string, canAutofix: boolean): void {
            const original = getText(node);
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
                                messageId: "preferCreateElSuggestion" as const,
                                data: { replacement, original },
                                fix(fixer) {
                                    return fixer.replaceText(node, replacement);
                                },
                            },
                        ],
                    }),
            });
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
                const variable = current.variables.find(
                    (v) => v.name === name,
                );
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
    },
});
