export default {
    name: 'object-assign',
    meta: {
        type: 'problem',
        docs: {
            description: 'Object.assign with two parameters instead of 3.',
            //TODO: Add url
        },
        schema: [],
        messages: {
            twoArgumentsDefault: 'Doing this will reassign the default.'
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (
                    node.callee &&
                    node.callee.type === 'MemberExpression' &&
                    node.callee.object &&
                    node.callee.object.name === 'Object' &&
                    node.callee.property &&
                    node.callee.property.name === 'assign' &&
                    node.arguments.length === 2 &&
                    node.arguments[0].type === 'Identifier' &&
                    node.arguments[0].name.toLowerCase().includes('default') &&
                    node.arguments[1].type !== 'ObjectExpression'
                ) {
                    context.report({
                        node,
                        messageId: 'twoArgumentsDefault'
                    });
                }
            },
        };
    },
};
