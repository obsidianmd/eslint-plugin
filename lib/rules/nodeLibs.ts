import { ESLintUtils } from '@typescript-eslint/utils';
import {Rule} from "eslint";

// The Rule creator returns a function that is used to create a well-typed ESLint rule
// The parameter passed into RuleCreator is a URL generator function.
const createRule = ESLintUtils.RuleCreator(name => `https://my-website.io/eslint/${name}`);

const rule: Rule.RuleModule = {
    create: context => {
        return {
            Literal: node => {
                context.report({
                    message: "😿",
                    node,
                });
            },
        };
    },
};

export = rule;

const nodeLibs = createRule({
    name: 'node-libraries',
    meta: {
        docs: {
            description: 'An example ESLint rule',
        },
        type: 'problem',
        messages: {
            desktopOnly: 'This package is desktop only'
        },
        schema: [],
    },
    defaultOptions: [],
    create: context => ({

    }),
});
