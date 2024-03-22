import { RuleModule } from '@typescript-eslint/utils/ts-eslint';
import { ESLint } from 'eslint';
import noLiteral from "./rules/nodeLibs";

export default {
    meta: {
        name: 'eslint-plugin-obsidian',
        version: '0.0.1',
    },
    rules: {
        "no-literal": noLiteral,
    },
    configs: {
        required: {
            rules: {
                "obsidian/node-libraries": "warn"
            }
        }
    }
};
