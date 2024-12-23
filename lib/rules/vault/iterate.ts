
export = {
    name: 'vault-iterate',
    meta: {
        docs: {
            description: 'Avoid iterating all files to find a file by its path\n',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path'
        },
        type: 'problem',
        messages: {
            iterate: 'Avoid iterating all files to find a file by its path\n'
        },
        schema: [],
        fixable: 'code'
    },
    defaultOptions: [],
    create: context => {
        return {
            MemberExpression(node) {
                if (
                    node.property.name === 'find' &&
                    node.object.type === 'CallExpression' &&
                    node.object.callee.type === 'MemberExpression' &&
                    node.object.callee.property.name === 'getFiles' &&
                    node.object.callee.object.type === 'MemberExpression' &&
                    node.object.callee.object.property.name === 'vault'
                ) {
                    context.report({
                        node,
                        messageId: 'iterate',
                    });
                    if (!node.arguments || node.arguments.length === 0) {
                        return;
                    }
                    let findArgument = node.arguments[0];
                    if (
                        findArgument.type === 'ArrowFunctionExpression' &&
                        findArgument.body.type === 'BinaryExpression' &&
                        findArgument.body.left.type === 'MemberExpression' &&
                        findArgument.body.left.object.type === 'Identifier' &&
                        findArgument.body.left.property.name === 'path' &&
                        (findArgument.body.operator === '===' || findArgument.body.operator === '==')
                    ) {
                        context.report({
                            node,
                            messageId: 'iterate',
                        });
                    }
                }
            },
        }
    }
};
