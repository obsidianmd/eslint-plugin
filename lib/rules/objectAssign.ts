export = {
    name: 'object-assign',
    meta: {
        docs: {
            description: 'Object.assign with two parameters instead of 3.',
            //TODO: Add url
        },
        type: 'problem',
        messages: {
            twoArgumentsDefault: 'Doing this will reassign the default.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            ':matches(CallExpression[callee.object.name="Object"][callee.property.name="assign"])': (node: any) => {
                if (node.arguments.length == 2) {
                    if(node.arguments[0].name.toLowerCase().includes('default') && node.arguments[1].type !== 'ObjectExpression') {
                        context.report({
                            node,
                            messageId: 'twoArgumentsDefault'
                        });
                    }

                }

            },
        };
    }
};
