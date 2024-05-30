import {manifest} from "../readManifest";
import {context} from "esbuild";

export = {
    name: 'settings-tab',
    meta: {
        docs: {
            description: 'Use sentence case in UI',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+sentence+case+in+UI'
        },
        type: 'problem',
        messages: {
            settings: 'Avoid "settings" in settings headings',
            general: 'Don\'t use a "general" heading in your settings',
            pluginName: 'Don\'t include a heading with the plugin name in settings',
            headingEl: 'Don\'t use HTML header elements for settings headings',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            Literal(node) {
                if(typeof node.value !== 'string') {
                    return;
                }
                if(node.value.toLowerCase().includes(manifest.name.toLowerCase())) {
                    context.report({
                        node,
                        messageId: 'pluginName'
                    })
                }
            },
            CallExpression(node) {
                if (node.callee.type === 'MemberExpression') {
                    if(node.callee.property.name === 'setName') {
                        const args = node.arguments;
                        if(args.length !== 1 || typeof args[0].value !== 'string') {
                            return;
                        }

                        if(args[0].value.toLowerCase().includes("settings")) {
                            context.report({
                                node: args[0],
                                messageId: 'settings'
                            })
                        }

                        if(args[0].value.toLowerCase().includes("general")) {
                            context.report({
                                node: args[0],
                                messageId: 'general'
                            });
                        }
                    }
                    if (node.callee.property.name === 'createEl') {
                        const args = node.arguments;
                        console.log(typeof args[0].value)

                        if(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(args[0].value)) {
                            context.report({
                                node: args[0],
                                messageId: 'headingEl'
                            });
                        }
                    }
                }
            }
        };
    }
};

