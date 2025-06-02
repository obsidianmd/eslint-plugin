const sampleNames = ['MyPlugin', 'MyPluginSettings', 'SampleSettingTab', 'SampleModal', 'mySetting'];

export default {
    name: 'sample-names',
    meta: {
        docs: {
            description: 'Rename sample plugin class names',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Rename+placeholder+class+names'
        },
        type: 'problem',
        messages: {
            rename: 'Rename the sample classes.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            TSInterfaceDeclaration (node) {
                if(sampleNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: 'rename'
                    });
                }
            },
            ClassDeclaration (node) {
                if(sampleNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: 'rename'
                    });
                }
            },
            PropertySignature (node) {
                if(sampleNames.includes(node.id.name)) {
                    context.report({
                        node: node.id,
                        messageId: 'rename'
                    });
                }
            }
        };
    }
};
