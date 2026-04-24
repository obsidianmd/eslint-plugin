import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
const TAG_SHORTHANDS = {
    div: "createDiv",
    span: "createSpan",
};
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export default ruleCreator({
    name: "prefer-create-el",
    meta: {
        type: "suggestion",
        docs: {
            description: "Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.",
        },
        schema: [],
        fixable: "code",
        messages: {
            preferCreateEl: "Use '{{replacement}}' instead of '{{original}}'.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                checkCreateElement(node);
                checkCreateElementNS(node);
                checkCreateElShorthand(node);
                checkCreateDocumentFragment(node);
            },
        };
        function checkCreateElement(node) {
            if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createElement" ||
                node.arguments.length !== 1) {
                return;
            }
            const obj = node.callee.object;
            const isDocGlobal = isGlobalDocument(obj);
            const isActiveDoc = obj.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.name === "activeDocument";
            if (!isDocGlobal && !isActiveDoc) {
                return;
            }
            const tagArg = node.arguments[0];
            const tagName = getStringLiteralValue(tagArg);
            const shorthand = tagName ? TAG_SHORTHANDS[tagName] : undefined;
            if (shorthand) {
                const prefix = isDocGlobal ? "" : getText(obj) + ".";
                const replacement = `${prefix}${shorthand}()`;
                report(node, replacement);
            }
            else {
                const prefix = isDocGlobal ? "" : getText(obj) + ".";
                const replacement = `${prefix}createEl(${getText(tagArg)})`;
                report(node, replacement);
            }
        }
        function checkCreateElementNS(node) {
            if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createElementNS" ||
                node.arguments.length < 2) {
                return;
            }
            const namespaceArg = node.arguments[0];
            const namespaceValue = getStringLiteralValue(namespaceArg);
            if (namespaceValue !== SVG_NAMESPACE) {
                return;
            }
            const obj = node.callee.object;
            const isDocGlobal = isGlobalDocument(obj);
            const isActiveDoc = obj.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.name === "activeDocument";
            if (!isDocGlobal && !isActiveDoc) {
                return;
            }
            const tagArg = node.arguments[1];
            const remainingArgs = node.arguments.slice(2);
            const prefix = isDocGlobal ? "" : getText(obj) + ".";
            const argsText = [getText(tagArg), ...remainingArgs.map((arg) => getText(arg))].join(", ");
            const replacement = `${prefix}createSvg(${argsText})`;
            report(node, replacement);
        }
        function checkCreateElShorthand(node) {
            let obj;
            let isDocGlobal = false;
            if (node.callee.type === TSESTree.AST_NODE_TYPES.Identifier) {
                if (node.callee.name !== "createEl") {
                    return;
                }
            }
            else if (node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
                if (node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "createEl") {
                    return;
                }
                obj = node.callee.object;
                isDocGlobal = isGlobalDocument(obj);
            }
            else {
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
            report(node, replacement);
        }
        function checkCreateDocumentFragment(node) {
            if (node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.callee.property.name !== "createDocumentFragment" ||
                node.arguments.length !== 0) {
                return;
            }
            const obj = node.callee.object;
            const isDocGlobal = isGlobalDocument(obj);
            const isActiveDoc = obj.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obj.name === "activeDocument";
            if (!isDocGlobal && !isActiveDoc) {
                return;
            }
            const replacement = isDocGlobal
                ? "createFragment()"
                : `${getText(obj)}.createFragment()`;
            report(node, replacement);
        }
        function report(node, replacement) {
            context.report({
                node,
                messageId: "preferCreateEl",
                data: { replacement, original: getText(node) },
                fix(fixer) {
                    return fixer.replaceText(node, replacement);
                },
            });
        }
        function isGlobalDocument(node) {
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                node.name !== "document") {
                return false;
            }
            const scope = context.sourceCode.getScope(node);
            const variable = findVariable(scope, node.name);
            return !variable || variable.defs.length === 0;
        }
        function findVariable(scope, name) {
            let current = scope;
            while (current) {
                const variable = current.variables.find((v) => v.name === name);
                if (variable) {
                    return variable;
                }
                current = current.upper;
            }
            return null;
        }
        function getText(node) {
            return context.sourceCode.getText(node);
        }
        function getStringLiteralValue(node) {
            if (node.type === TSESTree.AST_NODE_TYPES.Literal &&
                typeof node.value === "string") {
                return node.value;
            }
            return undefined;
        }
    },
});
