import { TSESLint, TSESTree } from "@typescript-eslint/utils";
export type Mode = "loose" | "strict";
export interface EvaluatorOptions {
    brands?: string[];
    acronyms?: string[];
    ignoreWords?: string[];
    ignoreRegex?: string[];
    mode?: Mode;
    enforceCamelCaseLower?: boolean;
}
export interface EvaluationResult {
    ok: boolean;
    suggestion?: string;
}
export interface SentenceCaseRuleConfig extends EvaluatorOptions {
    allowAutoFix?: boolean;
}
export type SentenceCaseRuleOptions = readonly [SentenceCaseRuleConfig?];
export interface SentenceCaseReporterParams<MessageId extends string> {
    context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>;
    evaluatorOptions: EvaluatorOptions;
    allowAutoFix: boolean;
    messageId: MessageId;
    formatReplacement?: (node: TSESTree.Node, suggestion: string) => string | null;
}
export type SentenceCaseReport = (node: TSESTree.Node, value: string) => void;
export declare function resolveSentenceCaseConfig(options: SentenceCaseRuleOptions): {
    config: SentenceCaseRuleConfig;
    evaluatorOptions: EvaluatorOptions;
    allowAutoFix: boolean;
};
export declare function createSentenceCaseReporter<MessageId extends string>(params: SentenceCaseReporterParams<MessageId>): SentenceCaseReport;
export declare function getContextFilename<MessageId extends string>(context: TSESLint.RuleContext<MessageId, SentenceCaseRuleOptions>): string | null;
export declare function isEnglishLocalePath(filePath: string, extensions: readonly string[]): boolean;
export declare function isExpressionNode(node: TSESTree.Node | null | undefined): node is TSESTree.Expression;
export declare function unwrapExpression(node: TSESTree.Node | null | undefined): TSESTree.Expression | null;
export declare function isSkippableString(text: string): boolean;
export declare function sentenceCaseSuggestion(text: string, options?: EvaluatorOptions): string;
export declare function evaluateSentenceCase(text: string, options?: EvaluatorOptions): EvaluationResult;
