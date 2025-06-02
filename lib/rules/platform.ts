import { TSESTree, TSESLint } from '@typescript-eslint/utils';

export default {
    name: 'platform',
    meta: {
        type: 'problem' as const,
        docs: {
            description: 'Disallow use of navigator API for OS detection',
            url: 'https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific+features'
        },
        schema: [],
        messages: {
            avoidNavigator: 'Avoid using the navigator API to detect the operating system. Use the Platform API instead.',
        },
    },
    create(context: TSESLint.RuleContext<'avoidNavigator', []>) {
        return {
            MemberExpression(node: TSESTree.MemberExpression) {
                if (
                    node.object &&
                    node.object.type === 'Identifier' &&
                    (node.object.name == 'window' || node.object.name === 'navigator') &&
                    node.property.type === 'Identifier' &&
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
