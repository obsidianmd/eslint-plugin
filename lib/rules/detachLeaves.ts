
export = {
    name: 'detach-leaves',
    meta: {
        docs: {
            description: 'Don\'t detach leaves in onunload.',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Don\'t+detach+leaves+in+%60onunload%60'
        },
        type: 'problem',
        messages: {
            onunload: 'Don\'t detach leaves in onunload.'
        },
        schema: [],
        fixable: 'code'
    },
    defaultOptions: [],
    create: context => {
        return {
            MethodDefinition(node: any) {
                if(node.key.type === 'Identifier' && node.key.name === 'onunload') {
                    node.value.body.body.forEach(statement => {
                        if (statement.type === 'ExpressionStatement' &&
                            statement.expression.type === 'CallExpression' &&
                            statement.expression.callee.property.name === 'detachLeavesOfType') {
                            context.report({
                                node,
                                messageId: 'onunload',
                                fix: fixer => fixer.remove(statement)
                            })
                        }
                    });
                }
            }
        }
    }
};
