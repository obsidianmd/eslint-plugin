import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

export default ruleCreator({
    meta: {
        docs: {
            description: "Disallow hardcoded `.obsidian` config paths. Use `Vault#configDir` instead.",
            url: docsUrl("hardcoded-config-path"),
        },
        type: "problem" as const,
        messages: {
            configPath:
                "Obsidian's configuration folder is not necessarily `.obsidian`, it can be configured by the user. Use `Vault#configDir` to get the current value",
        },
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            Literal(node: TSESTree.Literal) {
                if (
                    typeof node.value === "string" &&
                    node.value.match(/(?<![a-zA-Z0-9])\.obsidian(?![a-zA-Z_-])/)
                ) {
                    context.report({
                        node,
                        messageId: "configPath",
                    });
                }
            },
        };
    },
});
