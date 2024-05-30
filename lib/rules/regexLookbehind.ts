import {manifest} from "../readManifest";

export = {
    name: 'regex-lookbehind',
    meta: {
        docs: {
            description: 'Using lookbehinds in Regex is not supported in some iOS versions',
            url: 'https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Lookbehind+in+regular+expressions'
        },
        type: 'problem',
        messages: {
            lookbehind: 'Lookbehinds are not supported on iOS versions before 16.4.'
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            Literal(node) {
                if(/(\?<=|\?<!)/.test(node.value)) {
                    if(!manifest.isDesktopOnly) {
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
