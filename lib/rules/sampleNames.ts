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
        function reportSampleName(id: TSESTree.Identifier | null | undefined) {
            if (id && sampleTypeNames.includes(id.name)) {
                context.report({
                    node: id,
                    messageId: "rename",
                });
            }
        }

        return {
            TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
                reportSampleName(node.id);
            },
            // `type MyPluginSettings = { … }`, the interface written as a type.
            TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration) {
                reportSampleName(node.id);
            },
            ClassDeclaration(node: TSESTree.ClassDeclaration) {
                reportSampleName(node.id);
            },
            // `const MyPlugin = class extends Plugin {}`: the variable names
            // the class, as may the class itself (`class MyPlugin {}`).
            ClassExpression(node: TSESTree.ClassExpression) {
                const parent = node.parent;
                if (
                    parent.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
                    parent.init === node &&
                    parent.id.type === TSESTree.AST_NODE_TYPES.Identifier
                ) {
                    reportSampleName(parent.id);
                }
                reportSampleName(node.id);
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
