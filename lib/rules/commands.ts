import {
    getParserServices
} from "@typescript-eslint/utils/eslint-utils";
import {context} from "esbuild";
import {node} from "globals";

export = {
    name: 'commands',
    meta: {
        docs: {
            description: 'test',
            url: 'https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands'
        },
        type: 'problem',
        messages: {
            hotkeys: 'Avoid setting a default hotkey for commands'
        },
        schema: [],
    },
    defaultOptions: [],
    create: context => {
        if(context.parserServices?.hasFullTypeInformation === false) {
            return;
        }
        const services = getParserServices(context);
        const checker = services.program.getTypeChecker();
        return {
            Property(node) {
                const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                const type = checker.getTypeAtLocation(tsNode);
                if(!type.symbol) {
                    return;
                }
                for (let declaration of type.symbol.declarations) {
                }
                if(type.symbol.escapedName === 'hotkeys') {
                    context.report({
                        node,
                        messageId: 'hotkeys',
                    });
                }

            }
        }
    }
};
