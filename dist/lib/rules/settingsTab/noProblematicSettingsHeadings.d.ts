import { ESLintUtils } from "@typescript-eslint/utils";
type Options = [{
    pluginName?: string;
}?];
declare const _default: ESLintUtils.RuleModule<"settings" | "pluginName" | "general", Options, unknown, ESLintUtils.RuleListener>;
export default _default;
