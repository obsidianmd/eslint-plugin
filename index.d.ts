import { type Linter, type Rule } from "eslint";

declare module 'eslint-plugin-obsidianmd' {
    /**
     * Languages contributed by this plugin. `plain-text` exposes each line of a text file as a
     * `Line` node and backs `validate-license`; reference it as `language: "obsidianmd/plain-text"`.
     */
    export const languages: {
        [key: string]: unknown;
    };
    export const meta: {
        name: string;
        version: string;
    };
    export const configs: {
        recommended: Linter.Config;
        recommendedWithLocalesEn: Linter.Config;
    };
    export const rules: {
        [key: string]: Rule.RuleModule;
    };
    export const ruleConfigs: {
        recommended: Linter.RulesRecord;
        recommendedTypeChecked: Linter.RulesRecord;
    };
}
