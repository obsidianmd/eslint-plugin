import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESLint } from "@typescript-eslint/utils";
type MessageOverrides = Record<string, string>;
interface RuleConfig {
    messages: MessageOverrides;
    options?: unknown[];
    rule?: ESLintRule;
}
type RuleMessageConfig = Record<string, RuleConfig>;
type Options = [RuleMessageConfig];
interface ESLintRule {
    meta?: {
        messages?: Record<string, string>;
    };
    create: (context: TSESLint.RuleContext<string, unknown[]>) => TSESLint.RuleListener;
}
declare const _default: ESLintUtils.RuleModule<"customMessage", Options, unknown, ESLintUtils.RuleListener>;
export default _default;
