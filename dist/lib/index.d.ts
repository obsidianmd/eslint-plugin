import { type Config } from "@eslint/config-helpers";
import type { RuleDefinition, RuleDefinitionTypeOptions } from "@eslint/core";
declare const plugin: {
    meta: {
        name: string;
        version: string;
    };
    rules: Record<string, RuleDefinition<RuleDefinitionTypeOptions>>;
    configs: {
        recommended: Config[];
        recommendedWithLocalesEn: Config[];
    };
};
export default plugin;
