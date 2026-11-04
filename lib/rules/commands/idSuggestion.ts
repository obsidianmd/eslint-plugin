import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { isAddCommandCall, isCommandProperty, staticString } from "./property.js";
import type { StringEdit } from "./stringEdit.js";

/**
 * The command IDs of a file: the IDs of the object literals passed to
 * addCommand(), and of every other object literal with a name as well, which
 * may be a command defined elsewhere, as in an array of commands.
 */
export interface CommandIds {
    /** Takes the ID of an object literal, if it may be a command's. */
    add(object: TSESTree.ObjectExpression): void;
    has(id: string): boolean;
}

export function commandIds(): CommandIds {
    const ids = new Set<string>();
    return {
        add(object) {
            const isCommand = (object.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                object.parent.arguments[0] === object &&
                isAddCommandCall(object.parent)) ||
                object.properties.some((property) => isCommandProperty(property, "name"));
            if (!isCommand) {
                return;
            }
            for (const property of object.properties) {
                if (isCommandProperty(property, "id")) {
                    const id = staticString(property.value);
                    if (id !== null) {
                        ids.add(id);
                    }
                }
            }
        },
        has: (id) => ids.has(id),
    };
}

/**
 * The new ID and the fix of the suggestion that rewrites the command ID `literal` as
 * `edit` has it, in the same quotes and escapes. Null where it cannot be
 * written back, or where another command in the file already has that ID.
 */
export function idRewrite(
    literal: TSESTree.StringLiteral,
    edit: StringEdit | null,
    ids: CommandIds,
): { id: string; fix: TSESLint.ReportFixFunction } | null {
    const source = edit?.toSource(literal.raw);
    if (!edit || !source || ids.has(edit.text)) {
        return null;
    }
    return {
        id: edit.text,
        fix: (fixer) => fixer.replaceText(literal, source),
    };
}
