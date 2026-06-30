declare module "@microsoft/eslint-plugin-sdl" {
    import type { ESLint, Rule } from "eslint";

    interface SdlPlugin extends ESLint.Plugin {
        rules: {
            "no-document-write": Rule.RuleModule;
            "no-inner-html": Rule.RuleModule;
        };
    }
    const plugin: SdlPlugin;
    export default plugin;
}

declare module "eslint-plugin-import" {
    import type { Rule } from "eslint";

    export const rules: {
        "no-extraneous-dependencies": Rule.RuleModule;
        "no-nodejs-modules": Rule.RuleModule;
        [key: string]: Rule.RuleModule;
    };
    export const configs: Record<string, unknown>;
    export const flatConfigs: Record<string, unknown>;
}


declare module "eslint-plugin-no-unsanitized" {
    import type { ESLint, Linter, Rule } from "eslint";

    interface NoUnsanitizedPlugin extends ESLint.Plugin {
        rules: {
            property: Rule.RuleModule;
            method: Rule.RuleModule;
        };
        configs: {
            recommended: Linter.Config;
        };
    }
    const plugin: NoUnsanitizedPlugin;
    export default plugin;
}
