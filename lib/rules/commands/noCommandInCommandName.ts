import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { removePhrase } from "./nameRemoval.js";
import { isCommandProperty } from "./property.js";
import { phrasePattern } from "./words.js";

const COMMAND = phrasePattern("command")!;

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
                        typeof property.value.value === "string" &&
                        COMMAND.test(property.value.value)
                    ) {
                        const value = property.value;
                        // "Command: run" and "Run command", but not "Command palette"
                        const edit = removePhrase(value.value, COMMAND, {
                            prefixAfterSpace: false,
                            suffixAfterSpace: true,
                        });
                        const source = edit?.toSource(value.raw);
                        context.report({
                            node: property,
                            messageId: "commandInName",
                            suggest: edit && source
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
