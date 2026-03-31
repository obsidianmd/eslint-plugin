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
    import type { ESLint, Rule } from "eslint";

    interface ImportPlugin extends ESLint.Plugin {
        rules: {
            "no-extraneous-dependencies": Rule.RuleModule;
            "no-nodejs-modules": Rule.RuleModule;
        };
    }
    const plugin: ImportPlugin;
    export default plugin;
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
