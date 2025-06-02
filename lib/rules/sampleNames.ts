import { TSESTree, TSESLint } from '@typescript-eslint/utils';

const sampleNames = ['MyPlugin', 'MyPluginSettings', 'SampleSettingTab', 'SampleModal', 'mySetting'];

export default {
    name: 'sample-names',
    meta: {
        docs: {
            description: 'Rename sample plugin class names',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Rename+placeholder+class+names'
        },
        type: 'problem' as const,
        messages: {
            rename: 'Rename the sample classes.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context: TSESLint.RuleContext<'rename', []>) {
        return {
            TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
                if(sampleNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: 'rename'
                    });
                }
            },
            ClassDeclaration(node: TSESTree.ClassDeclaration) {
                if(node.id && sampleNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: 'rename'
                    });
                }
            },
            PropertySignature(node: TSESTree.TSPropertySignature) {
                if(node.key.type === 'Identifier' && sampleNames.includes(node.key.name)) {
                    context.report({
                        node: node.key,
                        messageId: 'rename'
                    });
                }
            }
        };
    }
};
