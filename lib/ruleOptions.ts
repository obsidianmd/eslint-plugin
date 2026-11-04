import type { ESLint } from "eslint";
import { gte as semverGte, valid as semverValid } from "semver";
import tseslint from "typescript-eslint";
import { DECLARATIVE_MIN_VERSION } from "./rules/settingsTab/shared.js";
import type { PluginManifest } from "./types/manifest.js";

export const restrictedGlobalsOptions = [
    {
        name: "app",
        message:
            "Avoid using the global app object. Instead use the reference provided by your plugin instance.",
    },
    {
        name: "fetch",
        message:
            "Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian.",
    },
    {
        name: "localStorage",
        message: "Prefer `App#saveLocalStorage` / `App#loadLocalStorage` functions to write / read localStorage data that's unique to a vault."
    }
] as const;

export const restrictedImportsOptions = [
    {
        name: "axios",
        message:
            "Use the built-in `requestUrl` function instead of `axios`.",
    },
    {
        name: "superagent",
        message:
            "Use the built-in `requestUrl` function instead of `superagent`.",
    },
    {
        name: "got",
        message:
            "Use the built-in `requestUrl` function instead of `got`.",
    },
    {
        name: "ofetch",
        message:
            "Use the built-in `requestUrl` function instead of `ofetch`.",
    },
    {
        name: "ky",
        message:
            "Use the built-in `requestUrl` function instead of `ky`.",
    },
    {
        name: "node-fetch",
        message:
            "Use the built-in `requestUrl` function instead of `node-fetch`.",
    },
    {
        name: "moment",
        message:
            "The 'moment' package is bundled with Obsidian. Import the `moment` value from 'obsidian' instead. For the `Moment` type, rely on the global `moment` namespace or add `type Moment = moment.Moment;` (type-only imports from 'moment' are allowed).",
        allowTypeImports: true,
    },
] as const;

export const noUnusedExpressionsOptions = [{ allowShortCircuit: true, allowTernary: true }] as const;

// `ignoreUsingDeclarations` first shipped in typescript-eslint 8.46.0, and older versions reject unknown options.
const supportsIgnoreUsingDeclarations = JSON.stringify((tseslint.plugin as ESLint.Plugin).rules?.["no-unused-vars"]?.meta?.schema ?? [])
    .includes('"ignoreUsingDeclarations"');

// `using` declarations are consumed through `Symbol.dispose` at block exit, but the syntax still requires a name.
// An `_` prefix marks a binding that has to exist but is deliberately unused: a caught error, a skipped array element.
// A dead `_x` variable is still reported (#199).
export const noUnusedVarsOptions = [{
    args: "none",
    caughtErrors: "all",
    caughtErrorsIgnorePattern: "^_",
    destructuredArrayIgnorePattern: "^_",
    ignoreRestSiblings: true,
    ...(supportsIgnoreUsingDeclarations ? { ignoreUsingDeclarations: true } : {}),
}] as const;

/**
 * The options for `@typescript-eslint/no-deprecated`, for a plugin with this
 * manifest.
 */
export function noDeprecatedOptions(manifest: PluginManifest | null) {
    // The obsidian typings mark SettingTab#display() `@deprecated Since 1.13.0`,
    // but before 1.13 there is no update() and display() is how a settings tab
    // renders and refreshes, so a plugin whose minAppVersion is below 1.13 has
    // to keep calling it. The settings-tab rules cover the move to 1.13
    // (prefer-update-over-display, no-deprecated-display, require-display), so
    // display() is only reported here from minAppVersion 1.13.0. Like those
    // rules, an unknown or invalid minAppVersion reports nothing.
    const minAppVersion = (manifest as { minAppVersion?: unknown } | null)?.minAppVersion;
    const displayIsDeprecated = typeof minAppVersion === "string"
        && semverValid(minAppVersion) !== null
        && semverGte(minAppVersion, DECLARATIVE_MIN_VERSION);
    return [{
        allow: [
            // The standard caretPositionFromPoint only reached WebKit in
            // Safari/iOS 17.4, so caretRangeFromPoint is still the fallback
            // that keeps caret lookup working on older iOS and Electron.
            // typescript-eslint matches a value specifier by name, so any
            // deprecated `caretRangeFromPoint` is allowed, not only the DOM's.
            { from: "lib", name: "caretRangeFromPoint" },
            ...(displayIsDeprecated ? [] : [
                // `tab.display()`, which resolves to obsidian's declaration.
                { from: "package", package: "obsidian", name: "display" },
                // `this.display()` in a tab that overrides display(): the
                // override is declared in the plugin's own file, and inherits
                // the @deprecated tag from SettingTab#display(). As with
                // caretRangeFromPoint, this allows any deprecated `display`.
                { from: "file", name: "display" },
            ]),
        ],
    }];
}
