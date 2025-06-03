import {manifest} from "../readManifest.js";
import { TSESTree, TSESLint } from '@typescript-eslint/utils';

export default {
    name: 'regex-lookbehind',
    meta: {
        docs: {
            description: 'Using lookbehinds in Regex is not supported in some iOS versions',
            url: 'https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Lookbehind+in+regular+expressions'
        },
        type: 'problem' as const,
        messages: {
            lookbehind: 'Lookbehinds are not supported on iOS versions before 16.4.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context: TSESLint.RuleContext<'lookbehind', []>) {
        return {
            Literal(node: TSESTree.Literal) {
                // Check RegExp literals
                if ('regex' in node && node.regex && typeof node.regex.pattern === 'string') {
                    if (/\(\?<=|\(\?<!\)/.test(node.regex.pattern)) {
                        if (!manifest.isDesktopOnly) {
                            context.report({
                                node,
                                messageId: 'lookbehind'
                            });
                        }
                    }
                }
                // Also check string literals (for RegExp constructor)
                if (typeof node.value === 'string' && /(\?<=|\?<!)/.test(node.value)) {
                    if (!manifest.isDesktopOnly) {
                        context.report({
                            node,
                            messageId: 'lookbehind'
                        });
                    }
                }
            }
        };
    }
};
