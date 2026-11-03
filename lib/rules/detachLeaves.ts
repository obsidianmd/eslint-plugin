import { ASTUtils, TSESTree, type TSESLint } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

export default ruleCreator({
    meta: {
        docs: {
            description: "Don't detach leaves in onunload.",
            url: docsUrl("detach-leaves"),
        },
        type: "problem" as const,
        messages: {
            onunload: "Don't detach leaves in onunload, as that will reset the leaf to it's default location when the plugin is loaded, even if the user has moved it to a different location.",
        },
        schema: [],
        fixable: "code" as const,
    },
    defaultOptions: [],
    create: (context) => {
        const sourceCode = context.sourceCode;
        const text = sourceCode.text;

        return {
            MethodDefinition(node: TSESTree.MethodDefinition) {
                if (
                    node.key.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    node.key.name === "onunload"
                ) {
                    if (
                        node.value.type === TSESTree.AST_NODE_TYPES.FunctionExpression &&
                        node.value.body &&
                        node.value.body.type === TSESTree.AST_NODE_TYPES.BlockStatement
                    ) {
                        const body = node.value.body;
                        body.body.forEach((statement) => {
                            if (
                                statement.type === TSESTree.AST_NODE_TYPES.ExpressionStatement &&
                                statement.expression.type ===
                                TSESTree.AST_NODE_TYPES.CallExpression &&
                                statement.expression.callee.type ===
                                TSESTree.AST_NODE_TYPES.MemberExpression &&
                                statement.expression.callee.property.type ===
                                TSESTree.AST_NODE_TYPES.Identifier &&
                                statement.expression.callee.property.name ===
                                "detachLeavesOfType"
                            ) {
                                context.report({
                                    node,
                                    messageId: "onunload",
                                    fix: (fixer) => fix(fixer, node, body, statement),
                                });
                            }
                        });
                    }
                }
            },
        };

        // Removes the call's line. When that leaves the method empty, the
        // method goes too where removing it cannot change what runs, and
        // otherwise the body becomes `{}` rather than keeping a blank line.
        function fix(
            fixer: TSESLint.RuleFixer,
            method: TSESTree.MethodDefinition,
            body: TSESTree.BlockStatement,
            statement: TSESTree.Statement,
        ): TSESLint.RuleFix {
            const leavesBodyEmpty =
                body.body.length === 1 &&
                !sourceCode.getCommentsInside(body).some((comment) => !isInside(comment, statement));
            if (!leavesBodyEmpty) {
                return fixer.removeRange(statementRange(statement));
            }
            return removeMethod(fixer, method) ?? fixer.replaceText(body, "{}");
        }

        // The statement with the whitespace around it on its line, and the
        // line break too when it is alone on its line.
        function statementRange(statement: TSESTree.Statement): TSESTree.Range {
            let start = statement.range[0];
            while (start > 0 && isHorizontalSpace(text[start - 1])) {
                start--;
            }
            let end = statement.range[1];
            while (end < text.length && isHorizontalSpace(text[end])) {
                end++;
            }
            const startsLine = start === 0 || isLineBreak(text[start - 1]);
            const endsLine = end === text.length || isLineBreak(text[end]);
            if (startsLine && endsLine) {
                // The whole line.
                return [start, end + (text.startsWith("\r\n", end) ? 2 : Math.min(1, text.length - end))];
            }
            if (endsLine) {
                // `{ this.save(); detach();` and a line break: the line break stays.
                return [start, end];
            }
            // `{ detach(); this.save(); }`: the code after it closes up.
            return [statement.range[0], end];
        }

        // Removing the method leaves Component#onunload(), which does nothing,
        // in its place. That holds only for a class that extends Obsidian's
        // Plugin directly: a class of the file's own in between may do work in
        // its onunload(), which the method overrides. Kept, too: a method with
        // a comment on or next to it, decorators, parameters (a default value
        // runs), `async` (it returns a promise), a static or computed one,
        // overloads, and one whose removal would let the members around it run
        // together.
        function removeMethod(
            fixer: TSESLint.RuleFixer,
            method: TSESTree.MethodDefinition,
        ): TSESLint.RuleFix | null {
            const classBody = method.parent;
            const classNode = classBody.parent;
            if (
                method.kind !== "method" ||
                method.static ||
                method.computed ||
                method.optional ||
                method.decorators.length > 0 ||
                method.value.params.length > 0 ||
                method.value.async ||
                method.value.generator ||
                method.value.typeParameters !== undefined ||
                !extendsObsidianPlugin(classNode) ||
                classBody.body.some((member) => member !== method && isOnunloadMember(member))
            ) {
                return null;
            }

            const before = sourceCode.getTokenBefore(method, { includeComments: true });
            let after = sourceCode.getTokenAfter(method, { includeComments: true });
            let end = method.range[1];
            let endLine = method.loc.end.line;
            if (after?.type === TSESTree.AST_TOKEN_TYPES.Punctuator && after.value === ";") {
                // `onunload() { … };`: the stray semicolon goes with it.
                end = after.range[1];
                endLine = after.loc.end.line;
                after = sourceCode.getTokenAfter(after, { includeComments: true });
            }
            if (!before || !after || isComment(before) || (isComment(after) && after.loc.start.line === endLine)) {
                return null;
            }
            const opensBody = before.range[0] === classBody.range[0];
            const closesBody = after.range[1] === classBody.range[1];
            // `foo = {}` and `[key]() {}` would read as `foo = {}[key]() {}`.
            const previous = classBody.body[classBody.body.indexOf(method) - 1];
            const endsMember =
                opensBody ||
                before.value === ";" ||
                previous?.type === TSESTree.AST_NODE_TYPES.StaticBlock ||
                (previous?.type === TSESTree.AST_NODE_TYPES.MethodDefinition &&
                    previous.value.type === TSESTree.AST_NODE_TYPES.FunctionExpression);
            if (!endsMember && !closesBody) {
                return null;
            }

            // Keep the space that separated the members around the method:
            // the indentation of the first member, the line break before the
            // class's `}`, or the wider of the two gaps in between.
            const spaceBefore = text.slice(before.range[1], method.range[0]);
            const spaceAfter = text.slice(end, after.range[0]);
            let space: string;
            if (opensBody && closesBody) {
                space = "";
            } else if (opensBody) {
                space = spaceBefore;
            } else if (closesBody) {
                space = spaceAfter;
            } else {
                space = lineBreaks(spaceBefore) > lineBreaks(spaceAfter) ? spaceBefore : spaceAfter;
            }
            return fixer.replaceTextRange([before.range[1], after.range[0]], space);
        }

        // `class extends Plugin`, with Plugin imported from "obsidian", or
        // `class extends obsidian.Plugin` with `import * as obsidian`.
        function extendsObsidianPlugin(classNode: ClassNode): boolean {
            const superClass = classNode.superClass;
            if (superClass?.type === TSESTree.AST_NODE_TYPES.Identifier) {
                const specifier = obsidianImport(superClass);
                return (
                    specifier?.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
                    (specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier
                        ? specifier.imported.name
                        : specifier.imported.value) === "Plugin"
                );
            }
            return (
                superClass?.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !superClass.computed &&
                superClass.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                superClass.property.name === "Plugin" &&
                superClass.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
                obsidianImport(superClass.object)?.type === TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier
            );
        }

        function obsidianImport(identifier: TSESTree.Identifier): TSESTree.ImportClause | null {
            const variable = ASTUtils.findVariable(sourceCode.getScope(identifier), identifier);
            const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
            if (
                def?.parent?.type !== TSESTree.AST_NODE_TYPES.ImportDeclaration ||
                def.parent.source.value !== "obsidian" ||
                def.parent.importKind === "type" ||
                (def.node.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier &&
                    def.node.type !== TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier)
            ) {
                return null;
            }
            return def.node;
        }
    },
});

function isOnunloadMember(member: TSESTree.ClassElement): boolean {
    return (
        "key" in member &&
        !member.computed &&
        ((member.key.type === TSESTree.AST_NODE_TYPES.Identifier && member.key.name === "onunload") ||
            (member.key.type === TSESTree.AST_NODE_TYPES.Literal && member.key.value === "onunload"))
    );
}

function isComment(token: TSESTree.Token): token is TSESTree.Comment {
    return token.type === TSESTree.AST_TOKEN_TYPES.Line || token.type === TSESTree.AST_TOKEN_TYPES.Block;
}

function isInside(inner: { range: TSESTree.Range }, outer: { range: TSESTree.Range }): boolean {
    return inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];
}

function isHorizontalSpace(char: string | undefined): boolean {
    return char === " " || char === "\t";
}

function isLineBreak(char: string | undefined): boolean {
    return char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029";
}

function lineBreaks(space: string): number {
    return space.split(/\r\n|[\n\r\u2028\u2029]/).length - 1;
}
