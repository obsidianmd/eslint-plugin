import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const sampleTypeNames = [
    "MyPlugin",
    "MyPluginSettings",
    "SampleSettingTab",
    "SampleModal",
];

const sampleSettingNames = ["mySetting"];

export default ruleCreator({
    meta: {
        docs: {
            description: "Rename sample plugin class names",
            url: docsUrl("sample-names"),
        },
        type: "problem" as const,
        messages: {
            rename: "Rename the sample classes.",
            renameSetting: "Rename the sample setting '{{name}}'.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
                if (sampleTypeNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: "rename",
                    });
                }
            },
            ClassDeclaration(node: TSESTree.ClassDeclaration) {
                if (node.id && sampleTypeNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: "rename",
                    });
                }
            },
            // A property of an interface or object type, such as the sample's
            // `interface MyPluginSettings { mySetting: string }`.
            TSPropertySignature(node: TSESTree.TSPropertySignature) {
                if (node.computed) {
                    return;
                }
                const name =
                    node.key.type === TSESTree.AST_NODE_TYPES.Identifier
                        ? node.key.name
                        : node.key.type === TSESTree.AST_NODE_TYPES.Literal
                          ? node.key.value
                          : undefined;
                if (typeof name === "string" && sampleSettingNames.includes(name)) {
                    context.report({
                        node: node.key,
                        messageId: "renameSetting",
                        data: { name },
                    });
                }
            },
        };
    },
});
