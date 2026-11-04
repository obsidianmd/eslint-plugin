import { ASTUtils, type TSESLint, TSESTree } from "@typescript-eslint/utils";
import { gte as semverGte } from "semver";
import ts from "typescript";
import { staticMemberName } from "../../memberName.js";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import {
    DECLARATIVE_MIN_VERSION,
    isPluginSettingTab,
    minAppVersionSchema,
    resolveMinAppVersion,
} from "./shared.js";

type Options = [{ minAppVersion?: string }?];
type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

/** Where Obsidian's typings declare `update()`: `SettingTab`, inherited by `PluginSettingTab`. */
const SETTING_TAB_CLASSES = new Set(["SettingTab", "PluginSettingTab"]);

export default ruleCreator<Options, "preferUpdate" | "replaceWithUpdate">({
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer this.update() over this.display() to refresh a PluginSettingTab on Obsidian 1.13+.",
            url: docsUrl("prefer-update-over-display", "settings-tab"),
        },
        schema: minAppVersionSchema,
        fixable: "code" as const,
        hasSuggestions: true as const,
        messages: {
            preferUpdate:
                "Call this.update() instead of this.display() to refresh a settings tab. On Obsidian 1.13+, re-calling display() does not refresh declarative settings.",
            replaceWithUpdate: "Replace with this.update().",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const minAppVersion = resolveMinAppVersion(context);
        // update() is the 1.13 refresh API — don't recommend it to plugins that
        // still target older Obsidian (or whose version we can't determine).
        if (!minAppVersion || !semverGte(minAppVersion, DECLARATIVE_MIN_VERSION)) {
            return {};
        }

        const services = context.sourceCode.parserServices;
        const program = services?.program;

        // Track the nearest enclosing class so we only flag `this.display()`
        // that resolves to a PluginSettingTab instance.
        const classStack: (ClassNode | null)[] = [];

        function enterClass(node: ClassNode) {
            classStack.push(isPluginSettingTab(node) ? node : null);
        }
        function exitClass() {
            classStack.pop();
        }

        /**
         * How far the `display` → `update` rename can be trusted:
         * - "fix": the installed typings give the tab SettingTab's update(), so
         *   the rewrite compiles and keeps the call's type;
         * - "suggest": it may not compile or may change a type, so a person
         *   should look at it;
         * - "none": the rewrite cannot be right.
         */
        function rewriteSafety(
            node: TSESTree.CallExpression,
            callee: TSESTree.MemberExpression,
            tab: ClassNode,
        ): "fix" | "suggest" | "none" {
            // update() takes no arguments: a display(arg) override's argument
            // would be dropped (and is a type error).
            if (node.arguments.length > 0) {
                return "none";
            }
            // update() calls getSettingDefinitions() and then, for an
            // imperative tab, display(): renaming a call in either of them (or
            // in the tab's own update() override) makes it call itself.
            const callsBack = callsBackIntoUpdate(node, tab);
            if (callsBack === true) {
                return "none";
            }
            if (callsBack === "maybe") {
                return "suggest";
            }
            return isSettingTabUpdate(callee.object, node) ? "fix" : "suggest";
        }

        // Whether the call sits anywhere in the tab's own `update` member, or
        // directly (not in a callback) in its getSettingDefinitions(). "maybe"
        // in a member computed from a value the code does not give, such as
        // an import: `[KEY]() {}` may be either.
        function callsBackIntoUpdate(
            node: TSESTree.CallExpression,
            tab: ClassNode,
        ): boolean | "maybe" {
            let nearestFunction: TSESTree.Node | null = null;
            let current: TSESTree.Node = node;
            while (current.parent) {
                const parent: TSESTree.Node = current.parent;
                if (parent === tab.body) {
                    const name = memberName(current, context.sourceCode);
                    if (name === undefined) {
                        return "maybe";
                    }
                    return (
                        name === "update" ||
                        (name === "getSettingDefinitions" &&
                            isMemberFunction(current, nearestFunction))
                    );
                }
                if (!nearestFunction && isFunction(current)) {
                    nearestFunction = current;
                }
                current = parent;
            }
            return false;
        }

        // Whether `fn` is the function a class member holds, as a method or a field.
        function isMemberFunction(
            member: TSESTree.Node,
            fn: TSESTree.Node | null,
        ): boolean {
            return (
                fn !== null &&
                (member.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                    member.type === TSESTree.AST_NODE_TYPES.PropertyDefinition) &&
                member.value === fn
            );
        }

        /**
         * Whether, per the type checker, `this.update()` resolves to Obsidian's
         * SettingTab#update() (only in typings for 1.13.0 and later) and returns
         * what the display() call returned as far as it is used. Without type
         * information this can't be known, so the answer is no.
         */
        function isSettingTabUpdate(
            receiver: TSESTree.Expression,
            call: TSESTree.CallExpression,
        ): boolean {
            if (!program || !services?.esTreeNodeToTSNodeMap) {
                return false;
            }
            const checker = program.getTypeChecker();
            const receiverType = checker.getApparentType(
                checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(receiver)),
            );
            const update = checker.getPropertyOfType(receiverType, "update");
            const declarations = update?.getDeclarations() ?? [];
            if (
                declarations.length === 0 ||
                !declarations.every((declaration) => {
                    const owner = declaration.parent;
                    return (
                        (ts.isClassDeclaration(owner) || ts.isInterfaceDeclaration(owner)) &&
                        owner.name !== undefined &&
                        SETTING_TAB_CLASSES.has(owner.name.text)
                    );
                })
            ) {
                return false;
            }
            // update() returns void. Where the result is used, the display()
            // override must return void too: an `async display()` returns a
            // Promise that `await this.display()` waits for.
            if (isResultDiscarded(call)) {
                return true;
            }
            const result = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(call));
            return (result.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined)) !== 0;
        }

        return {
            ClassDeclaration: enterClass,
            "ClassDeclaration:exit": exitClass,
            ClassExpression: enterClass,
            "ClassExpression:exit": exitClass,
            CallExpression(node: TSESTree.CallExpression) {
                const tab = classStack[classStack.length - 1];
                if (!tab) {
                    return;
                }
                const callee = node.callee;
                if (
                    callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    callee.computed ||
                    callee.object.type !== TSESTree.AST_NODE_TYPES.ThisExpression ||
                    callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    callee.property.name !== "display"
                ) {
                    return;
                }
                const property = callee.property;
                const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(property, "update");
                const safety = rewriteSafety(node, callee, tab);
                if (safety === "fix") {
                    context.report({ node, messageId: "preferUpdate", fix });
                } else if (safety === "suggest") {
                    context.report({
                        node,
                        messageId: "preferUpdate",
                        suggest: [{ messageId: "replaceWithUpdate", fix }],
                    });
                } else {
                    context.report({ node, messageId: "preferUpdate" });
                }
            },
        };
    },
});

function isFunction(node: TSESTree.Node): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
        node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression ||
        node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration
    );
}

// The name a method or a field has when the class is defined: the one its key
// spells out, or the value of a computed key where the code gives it
// (`const key = "refresh"; [key]() {}`). Null for another member or a name
// that is not a string, undefined where the value is not known.
function memberName(member: TSESTree.Node, sourceCode: TSESLint.SourceCode): string | null | undefined {
    if (
        member.type !== TSESTree.AST_NODE_TYPES.MethodDefinition &&
        member.type !== TSESTree.AST_NODE_TYPES.PropertyDefinition
    ) {
        return null;
    }
    const name = staticMemberName(member);
    if (name !== null || !member.computed) {
        return name;
    }
    const value = ASTUtils.getStaticValue(member.key, sourceCode.getScope(member));
    if (value === null) {
        return undefined;
    }
    return typeof value.value === "string" ? value.value : null;
}

function isResultDiscarded(node: TSESTree.CallExpression): boolean {
    // `this.display?.()` is wrapped in a ChainExpression.
    const expression = node.parent.type === TSESTree.AST_NODE_TYPES.ChainExpression ? node.parent : node;
    const parent = expression.parent;
    return (
        parent?.type === TSESTree.AST_NODE_TYPES.ExpressionStatement ||
        (parent?.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "void")
    );
}
