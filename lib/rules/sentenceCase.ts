export = {
    name: 'sentence-case',
    meta: {
        docs: {
            description: 'Use sentence case in UI',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+sentence+case+in+UI'
        },
        type: 'problem',
        messages: {
            casing: 'Use sentence case in UI'
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
                if(stringSentenceCase(node.value) !== node.value) {
                    return;
                    //rule disabled for now, to many false positives.
                    context.report({
                        node,
                        messageId: 'casing'
                    });
                }
            }
        };
    }
};


function stringSentenceCase(str: string) {
    return str.replace(/\.\s+([a-z])[^\.]|^(\s*[a-z])[^\.]/g, s => s.replace(/([a-z])/,s => s.toUpperCase()))
}
