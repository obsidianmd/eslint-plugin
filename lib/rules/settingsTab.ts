import {manifest} from "../readManifest";

export = {
    name: 'settings-tab',
    meta: {
        docs: {
            description: '',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text'
        },
        type: 'problem',
        messages: {
            settings: 'Avoid "settings" in settings headings',
            general: 'Don\'t use a "general" heading in your settings',
            pluginName: 'Don\'t include a heading with the plugin name in settings',
            headingEl: 'Don\'t use HTML header elements for settings headings',
        },
        schema: [],
        fixable: 'code'
    },
    defaultOptions: [],
    create(context) {
        let insidePluginSettingTab = false;
        return {
            ClassDeclaration(node) {
                // Check if the class extends `PluginSettingTab`
                if(node.superClass && node.superClass.name === 'PluginSettingTab') {
                    insidePluginSettingTab = true;
                }
            },
            'ClassDeclaration:exit'(node) {
                if(insidePluginSettingTab) {
                    insidePluginSettingTab = false;
                }
            },


            ExpressionStatement(node) {
                if (insidePluginSettingTab && node.expression?.type === 'CallExpression') {
                    const methods = [];
                    let callExpr = node.expression;
                    let text = '';

                    while (callExpr && callExpr.type === 'CallExpression' && callExpr.callee && callExpr.callee.property) {
                        const property = callExpr.callee.property;

                        if (property && property.type === 'Identifier') {
                            const property = callExpr.callee.property;

                            if (property.type === 'Identifier') {
                                const callName = property.name;
                                const args = callExpr.arguments;

                                if (callName === 'setName' && args.length > 0 && args[0]?.type === 'Literal') {
                                    methods.push(callName);
                                    text = args[0].value;
                                }

                                if (callName === 'setHeading') {
                                    methods.push(callName);
                                }
                            }

                            callExpr = callExpr.callee.object;
                        }

                        if (callExpr?.type === 'NewExpression' &&
                            callExpr.callee?.type === 'Identifier' &&
                            callExpr.callee.name === 'Setting' &&
                            methods.includes('setName') &&
                            methods.includes('setHeading')) {

                            if(['settings', 'options', 'configuration', 'config'].some(str => text.toLowerCase().includes(str))) {
                                context.report({
                                    node,
                                    messageId: 'settings',
                                    fix: fixer => fixer.remove(node),
                                })
                            }
                            if(text.toLowerCase().includes('general')) {
                                context.report({
                                    node,
                                    messageId: 'general',
                                    fix: fixer => fixer.remove(node),
                                })
                            }
                            if(text.toLowerCase().includes(manifest.name.toLowerCase())) {
                                context.report({
                                    node,
                                    messageId: 'pluginName',
                                    fix: fixer => fixer.remove(node),
                                })
                            }
                        }
                    }
                }
            },

            CallExpression(node) {
                if (node.callee.type === 'MemberExpression') {
                    if (node.callee.property.name === 'createEl') {
                        const args = node.arguments;

                        const containerObjectName = node.callee.object.name;
                        const textProperty = node.arguments[1].properties.find(property => property.key.value === 'text' || property.key.name === 'text');
                        if (!textProperty) return;
                        const textValue = textProperty.value.value;

                        if(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(args[0].value)) {
                            context.report({
                                node: args[0],
                                messageId: 'headingEl',
                                fix: fixer => fixer.replaceText(node, `new Setting(${containerObjectName}).setName("${textValue}").setHeading()`)
                            });
                        }
                    }
                }
            }
        };
    }
};

