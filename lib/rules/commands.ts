import { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { manifest } from "../readManifest.js";

export default {
    name: 'commands',
    meta: {
        docs: {
            description: 'Command guidelines',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands'
        },
        type: 'problem' as const,
        messages: {
            hotkeys: 'We recommend against providing a default hotkey when possible.',
            commandInId: 'Adding `command` to the command ID is not necessary.',
            commandInName: 'Adding `command` to the command name is not necessary.',
            pluginName: 'The command name should not include the plugin name.',
            pluginId: 'The command ID should not include the plugin ID.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context: TSESLint.RuleContext<'hotkeys' | 'commandInId' | 'commandInName' | 'pluginName' | 'pluginId', []>) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'addCommand' &&
                    node.arguments.length > 0 &&
                    node.arguments[0].type === 'ObjectExpression'
                ) {
                    const argument = node.arguments[0];

                    argument.properties.forEach(property => {
                        if (property.type === 'Property' && property.key.type === 'Identifier') {
                            if (property.key.name === 'id' && property.value.type === 'Literal' && typeof property.value.value === 'string') {
                                if (property.value.value.toLowerCase().includes('command')) {
                                    context.report({
                                        node: property,
                                        messageId: 'commandInId'
                                    });
                                }
                                if (typeof manifest.id === 'string' && property.value.value.includes(manifest.id)) {
                                    context.report({
                                        node: property,
                                        messageId: 'pluginId'
                                    });
                                }
                            }
                            if (property.key.name === 'name' && property.value.type === 'Literal' && typeof property.value.value === 'string') {
                                if (property.value.value.toLowerCase().includes('command')) {
                                    context.report({
                                       node: property,
                                       messageId: 'commandInName'
                                    });
                                }
                                if (typeof manifest.name === 'string' && property.value.value.toLowerCase().includes(manifest.name.toLowerCase())) {
                                    context.report({
                                        node: property,
                                        messageId: 'pluginName'
                                    });
                                }
                            }
                            if (property.key.name === 'hotkeys') {
                                context.report({
                                   node: property,
                                   messageId: 'hotkeys'
                                });
                            }
                        }
                    });
                }
            },
        };
    },
};
