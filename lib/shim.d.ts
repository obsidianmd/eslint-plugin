declare module "eslint-plugin-deprecation";
declare module "@microsoft/eslint-plugin-sdl";
declare module "eslint-plugin-import";


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
