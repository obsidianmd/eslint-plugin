export default {
    name: 'platform',
    meta: {
        type: 'problem',
    docs: {
        description: 'Disallow use of navigator API for OS detection',
        url: 'https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific+features'
    },
    schema: [],
    messages: {
        avoidNavigator: 'Avoid using the navigator API to detect the operating system. Use the Platform API instead.',
    },
},
create(context) {
    return {
        MemberExpression(node) {
            if (
                node.object &&
                (node.object.name == 'window' || node.object.name === 'navigator') &&
                ['userAgent', 'platform'].includes(node.property.name)
            ) {
                context.report({
                    node,
                    messageId: 'avoidNavigator',
                });
            }
        },
    };
},
};
