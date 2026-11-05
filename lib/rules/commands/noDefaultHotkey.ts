import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { isCommandProperty } from "./property.js";

const LINE_BREAK = /\r\n|[\r\n\u2028\u2029]/gu;

function isComma(token: TSESTree.Token): boolean {
    return token.type === TSESTree.AST_TOKEN_TYPES.Punctuator && token.value === ",";
}

/** Where the first line break in `text` starts, or -1. */
function firstLineBreak(text: string): number {
    return text.search(LINE_BREAK);
}

/** Where the last line break in `text` starts, or -1. */
function lastLineBreak(text: string): number {
    let last = -1;
    for (const match of text.matchAll(LINE_BREAK)) {
        last = match.index;
    }
    return last;
}

/**
 * The ranges to remove so that `property` goes from `object` with its comma,
 * and the object keeps its layout: on a line of its own, the property goes
 * with its line; on a line with others, with the space after it. Comments
 * next to it stay. Null where a comment is inside the property, or between
 * it and its comma.
 */
function propertyRemoval(
    sourceCode: Readonly<TSESLint.SourceCode>,
    object: TSESTree.ObjectExpression,
    property: TSESTree.Property,
): Array<[number, number]> | null {
    const ranges = removalRanges(sourceCode, object, property);
    const comments = sourceCode.getAllComments();
    const removesComment = ranges?.some(([start, end]) =>
        comments.some((comment) => comment.range[0] < end && comment.range[1] > start));
    return removesComment ? null : ranges;
}

function removalRanges(
    sourceCode: Readonly<TSESLint.SourceCode>,
    object: TSESTree.ObjectExpression,
    property: TSESTree.Property,
): Array<[number, number]> | null {
    const text = sourceCode.text;
    if (object.properties.length === 1) {
        // `{ hotkeys: [] }` becomes `{}`
        if (sourceCode.getCommentsInside(object).length > 0) {
            return null;
        }
        return [[object.range[0] + 1, object.range[1] - 1]];
    }
    const next = sourceCode.getTokenAfter(property, { includeComments: true });
    const before = sourceCode.getTokenBefore(property, { includeComments: true });
    if (sourceCode.getCommentsInside(property).length > 0 || !next || !before) {
        return null;
    }
    const ownComma = sourceCode.getTokenAfter(property);
    if (ownComma && isComma(ownComma)) {
        const afterComma = sourceCode.getTokenAfter(ownComma, { includeComments: true });
        if (ownComma.range[0] !== next.range[0] || !afterComma) {
            // `hotkeys: [] /* note */,`
            return null;
        }
        const spaceBefore = text.slice(before.range[1], property.range[0]);
        const spaceAfter = text.slice(ownComma.range[1], afterComma.range[0]);
        const breakBefore = lastLineBreak(spaceBefore);
        const breakAfter = firstLineBreak(spaceAfter);
        if (breakAfter < 0) {
            // `a, hotkeys: [], b` and `hotkeys: [], // note`
            return [[property.range[0], afterComma.range[0]]];
        }
        // The property ends its line: it goes with its line, or with the
        // space before it on a line with others
        const start = breakBefore < 0 ? before.range[1] : before.range[1] + breakBefore;
        return [[start, ownComma.range[1] + breakAfter]];
    }
    // The last property, without a trailing comma: the comma before it goes
    const comma = sourceCode.getTokenBefore(property);
    if (!comma || !isComma(comma)) {
        return null;
    }
    const nextIsComment = next.type === TSESTree.AST_TOKEN_TYPES.Line || next.type === TSESTree.AST_TOKEN_TYPES.Block;
    if (nextIsComment && firstLineBreak(text.slice(property.range[1], next.range[0])) < 0) {
        // `hotkeys: [] // note`: the comment stays where it is
        return [[comma.range[0], comma.range[1]], [property.range[0], next.range[0]]];
    }
    if (before.range[0] === comma.range[0]) {
        return [[comma.range[0], property.range[1]]];
    }
    // `a, // note` and then `hotkeys: []`: the comment stays after `a`
    const breakBefore = lastLineBreak(text.slice(before.range[1], property.range[0]));
    const start = breakBefore < 0 ? before.range[1] : before.range[1] + breakBefore;
    return [[comma.range[0], comma.range[1]], [start, property.range[1]]];
}

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Discourage providing default hotkeys for commands.",
            url: docsUrl("no-default-hotkeys", "commands"),
        },
        hasSuggestions: true as const,
        messages: {
            hotkeys:
                "Don't provide a default hotkey, as they might conflict with other hotkeys the user has already set, or that are included with Obsidian by default.",
            removeHotkeys:
                "Remove the default hotkeys. Existing users lose the binding unless they set a hotkey of their own.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== "addCommand" ||
                    node.arguments[0]?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
                ) {
                    return;
                }

                const commandObject = node.arguments[0];
                for (const property of commandObject.properties) {
                    if (
                        isCommandProperty(property, "hotkeys")
                    ) {
                        const ranges = propertyRemoval(context.sourceCode, commandObject, property);
                        context.report({
                            node: property,
                            messageId: "hotkeys",
                            suggest: ranges
                                ? [{
                                    messageId: "removeHotkeys",
                                    fix: (fixer) => ranges.map((range) => fixer.removeRange(range)),
                                }]
                                : [],
                        });
                    }
                }
            },
        };
    },
});
