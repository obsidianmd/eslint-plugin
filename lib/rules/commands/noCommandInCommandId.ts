import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { COMMAND, isRedundantCommandInId, redundantCommandInName } from "./commandWord.js";
import { removeIdWords } from "./idRemoval.js";
import { commandIds, idRewrite } from "./idSuggestion.js";
import { isCommandProperty, staticString } from "./property.js";

// Whether the command's name uses "command" as a word it needs, as
// "Copy URI for command" does: then the ID's "command" is that word too.
function nameNeedsCommand(command: TSESTree.ObjectExpression): boolean {
    return command.properties.some((property) => {
        if (!isCommandProperty(property, "name")) {
            return false;
        }
        const name = staticString(property.value);
        return name !== null && COMMAND.test(name) && redundantCommandInName(name) === null;
    });
}

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow using the word 'command' in a command ID.",
            url: docsUrl("no-command-in-command-id", "commands"),
        },
        hasSuggestions: true as const,
        messages: {
            commandInId: "Adding `command` to the command ID is not necessary.",
            removeCommand:
                "Rename the command ID to \"{{id}}\", without `command`. Users lose any hotkey they set for this command, and executeCommandById() calls, obsidian:// URIs and other plugins that run it by its old ID stop working.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const ids = commandIds();
        const reported: Array<{ property: TSESTree.Property; value: TSESTree.StringLiteral }> = [];
        return {
            ObjectExpression(node: TSESTree.ObjectExpression) {
                ids.add(node);
            },
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
                        isCommandProperty(property, "id") &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string" &&
                        isRedundantCommandInId(property.value.value) &&
                        !nameNeedsCommand(commandObject)
                    ) {
                        reported.push({ property, value: property.value });
                    }
                }
            },
            // Reported once every command ID in the file is known, so that a
            // suggestion never gives two commands the same ID
            "Program:exit"() {
                for (const { property, value } of reported) {
                    const rewrite = idRewrite(value, removeIdWords(value.value, ["command"]), ids);
                    context.report({
                        node: property,
                        messageId: "commandInId",
                        suggest: rewrite ? [{ messageId: "removeCommand", data: { id: rewrite.id }, fix: rewrite.fix }] : [],
                    });
                }
            },
        };
    },
});
