import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { redundantCommandInName } from "./commandWord.js";
import { isCommandProperty } from "./property.js";

export default ruleCreator({
    meta: {
        type: "suggestion" as const,
        docs: {
            description: "Disallow using the word 'command' in a command name.",
            url: docsUrl("no-command-in-command-name", "commands"),
        },
        hasSuggestions: true as const,
        messages: {
            commandInName:
                "Adding `command` to the command name is not necessary.",
            removeCommand: "Rename the command to \"{{name}}\", without `command`.",
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
                        isCommandProperty(property, "name") &&
                        property.value.type === TSESTree.AST_NODE_TYPES.Literal &&
                        typeof property.value.value === "string"
                    ) {
                        const value = property.value;
                        // "Command: open note" and "Open settings command",
                        // but not "Command palette", "Run command" or
                        // "Copy URI for command"
                        const edit = redundantCommandInName(value.value);
                        if (!edit) {
                            continue;
                        }
                        const source = edit.toSource(value.raw);
                        context.report({
                            node: property,
                            messageId: "commandInName",
                            suggest: source
                                ? [{
                                    messageId: "removeCommand",
                                    data: { name: edit.text },
                                    fix: (fixer) => fixer.replaceText(value, source),
                                }]
                                : [],
                        });
                    }
                }
            },
        };
    },
});
