import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { isObsidianChainingThen } from "../obsidianChaining.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

type FunctionNode =
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression;

export default ruleCreator({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow awaiting `Setting` and UI components, whose `then` is for chaining and never settles a promise.",
            url: docsUrl("no-await-chainable"),
            requiresTypeChecking: true,
        },
        schema: [],
        messages: {
            await: "'{{className}}.then' is for chaining, so awaiting it never settles and blocks the app. Remove the 'await'.",
            return: "'{{className}}.then' is for chaining, so returning it from an async function never settles and blocks the app. Return it from a non-async function, or don't return it.",
        },
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const functionStack: FunctionNode[] = [];

        function getChainableClass(node: TSESTree.Node): string | undefined {
            const type = services.getTypeAtLocation(node);
            for (const part of type.isUnion() ? type.types : [type]) {
                const then = part.getProperty("then");
                if (then && isObsidianChainingThen(then)) {
                    return part.getSymbol()?.name ?? services.program.getTypeChecker().typeToString(part);
                }
            }
            return undefined;
        }

        function checkReturned(node: TSESTree.Expression): void {
            if (!functionStack.at(-1)?.async) {
                return;
            }
            const className = getChainableClass(node);
            if (className) {
                context.report({ node, messageId: "return", data: { className } });
            }
        }

        function enterFunction(node: FunctionNode): void {
            functionStack.push(node);
            if (node.body.type !== TSESTree.AST_NODE_TYPES.BlockStatement) {
                checkReturned(node.body);
            }
        }

        function exitFunction(): void {
            functionStack.pop();
        }

        return {
            ArrowFunctionExpression: enterFunction,
            "ArrowFunctionExpression:exit": exitFunction,
            FunctionDeclaration: enterFunction,
            "FunctionDeclaration:exit": exitFunction,
            FunctionExpression: enterFunction,
            "FunctionExpression:exit": exitFunction,
            AwaitExpression(node: TSESTree.AwaitExpression) {
                const className = getChainableClass(node.argument);
                if (className) {
                    context.report({ node, messageId: "await", data: { className } });
                }
            },
            ReturnStatement(node: TSESTree.ReturnStatement) {
                if (node.argument) {
                    checkReturned(node.argument);
                }
            },
        };
    },
});
