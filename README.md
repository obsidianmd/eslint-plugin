# eslint-plugin-obsidianmd

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-obsidianmd`:

```sh
npm install eslint-plugin-obsidianmd --save-dev
```

## Usage

Add the recommended configuration to your `eslint.config.mjs`. This enables all recommended rules, including ESLint core, typescript-eslint type-checked rules, and Obsidian-specific rules.

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
    rules: {
      // example: turn off a rule from the recommended set
      "obsidianmd/sample-names": "off",
    },
  },
]);
```

The `parserOptions` block is required because the recommended config includes type-checked rules that need access to your TypeScript project. `allowDefaultProject` ensures files not listed in your `tsconfig.json` (like the ESLint config file itself) are still linted without errors. See the [configuration guide](docs/configuration.md) for details on why this is needed and how to customize it.

> **Note:** You do not need to separately add `eslint.configs.recommended` or `tseslint.configs.recommended` — both are already included in the recommended config.

The recommended config also lints files that are not source, matching `package.json` and
`manifest.json` by name. **Run ESLint from the project root**: a lint script scoped to your sources —
`eslint src` — never visits them, and their checks silently do nothing. See
[Files linted beyond your source](docs/configuration.md#files-linted-beyond-your-source).

For advanced usage — layering stricter typescript-eslint configs, ignoring files, disabling rules for non-plugin code, and troubleshooting common errors — see the [configuration guide](docs/configuration.md).

## Configurations

<!-- begin auto-generated configs list -->

|      | Name                       |
| :--- | :------------------------- |
| ✅    | `recommended`              |
| 🇬🇧 | `recommendedWithLocalesEn` |

<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
🚫 Configurations disabled in.\
✅ Set in the `recommended` configuration.\
🇬🇧 Set in the `recommendedWithLocalesEn` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                                                         | Description                                                                                                                                           | 💼     | ⚠️     | 🚫     | 🔧 | 💡 |
| :----------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :----- | :----- | :- | :- |
| [commands/no-command-in-command-id](docs/rules/commands/no-command-in-command-id.md)                         | Disallow using the word 'command' in a command ID.                                                                                                    |        | ✅ 🇬🇧 |        |    |    |
| [commands/no-command-in-command-name](docs/rules/commands/no-command-in-command-name.md)                     | Disallow using the word 'command' in a command name.                                                                                                  |        | ✅ 🇬🇧 |        |    |    |
| [commands/no-default-hotkeys](docs/rules/commands/no-default-hotkeys.md)                                     | Discourage providing default hotkeys for commands.                                                                                                    |        | ✅ 🇬🇧 |        |    |    |
| [commands/no-plugin-id-in-command-id](docs/rules/commands/no-plugin-id-in-command-id.md)                     | Disallow including the plugin ID in a command ID.                                                                                                     |        | ✅ 🇬🇧 |        |    |    |
| [commands/no-plugin-name-in-command-name](docs/rules/commands/no-plugin-name-in-command-name.md)             | Disallow including the plugin name in a command name.                                                                                                 |        | ✅ 🇬🇧 |        |    |    |
| [detach-leaves](docs/rules/detach-leaves.md)                                                                 | Don't detach leaves in onunload.                                                                                                                      | ✅ 🇬🇧 |        |        | 🔧 |    |
| [editor-drop-paste](docs/rules/editor-drop-paste.md)                                                         | Require checking `evt.defaultPrevented` and calling `evt.preventDefault()` in editor-drop/editor-paste handlers.                                      |        | ✅ 🇬🇧 |        |    |    |
| [hardcoded-config-path](docs/rules/hardcoded-config-path.md)                                                 | Disallow hardcoded `.obsidian` config paths. Use `Vault#configDir` instead.                                                                           |        | ✅ 🇬🇧 |        |    |    |
| [no-forbidden-elements](docs/rules/no-forbidden-elements.md)                                                 | Disallow attachment of forbidden elements to the DOM in Obsidian plugins.                                                                             | ✅ 🇬🇧 |        |        |    |    |
| [no-global-this](docs/rules/no-global-this.md)                                                               | Disallow `global` and `globalThis`. Use `window` or `activeWindow` for popout window compatibility.                                                   |        | ✅ 🇬🇧 |        | 🔧 |    |
| [no-nodejs-modules](docs/rules/no-nodejs-modules.md)                                                         | Disallow importing Node.js built-in modules unless guarded by Platform.isDesktop                                                                      |        | ✅ 🇬🇧 |        |    |    |
| [no-plugin-as-component](docs/rules/no-plugin-as-component.md)                                               | Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks.                                                   | ✅ 🇬🇧 |        |        |    |    |
| [no-sample-code](docs/rules/no-sample-code.md)                                                               | Disallow sample code snippets from the Obsidian plugin template.                                                                                      | ✅ 🇬🇧 |        |        | 🔧 |    |
| [no-static-styles-assignment](docs/rules/no-static-styles-assignment.md)                                     | Disallow setting styles directly on DOM elements, favoring CSS classes instead.                                                                       | ✅ 🇬🇧 |        |        |    |    |
| [no-tfile-tfolder-cast](docs/rules/no-tfile-tfolder-cast.md)                                                 | Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.                                                                      |        | ✅ 🇬🇧 |        |    |    |
| [no-unsupported-api](docs/rules/no-unsupported-api.md)                                                       | Disallow usage of Obsidian APIs not available in the plugin's minimum app version                                                                     | ✅ 🇬🇧 |        |        |    |    |
| [no-view-references-in-plugin](docs/rules/no-view-references-in-plugin.md)                                   | Disallow storing references to custom views directly in the plugin, which can cause memory leaks.                                                     | ✅ 🇬🇧 |        |        |    |    |
| [object-assign](docs/rules/object-assign.md)                                                                 | Discourage using `Object.assign` with two arguments                                                                                                   |        | ✅ 🇬🇧 |        |    |    |
| [platform](docs/rules/platform.md)                                                                           | Disallow use of navigator API for OS detection                                                                                                        | ✅ 🇬🇧 |        |        |    |    |
| [prefer-abstract-input-suggest](docs/rules/prefer-abstract-input-suggest.md)                                 | Disallow Liam's frequently copied `TextInputSuggest` implementation in favor of the built-in `AbstractInputSuggest`.                                  |        | ✅ 🇬🇧 |        |    |    |
| [prefer-active-doc](docs/rules/prefer-active-doc.md)                                                         | Prefer `activeDocument` over `document` for popout window compatibility.                                                                              |        |        | ✅ 🇬🇧 |    |    |
| [prefer-create-el](docs/rules/prefer-create-el.md)                                                           | Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.                           |        | ✅ 🇬🇧 |        | 🔧 | 💡 |
| [prefer-file-manager-trash-file](docs/rules/prefer-file-manager-trash-file.md)                               | Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.                                                         |        | ✅ 🇬🇧 |        |    |    |
| [prefer-get-language](docs/rules/prefer-get-language.md)                                                     | Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.   |        | ✅ 🇬🇧 |        |    |    |
| [prefer-instanceof](docs/rules/prefer-instanceof.md)                                                         | Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.                                              |        | ✅ 🇬🇧 |        | 🔧 | 💡 |
| [prefer-window-timers](docs/rules/prefer-window-timers.md)                                                   | Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.                                      |        | ✅ 🇬🇧 |        | 🔧 |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md)                                                           | Using lookbehinds in Regex is not supported in some iOS versions                                                                                      | ✅ 🇬🇧 |        |        |    |    |
| [rule-custom-message](docs/rules/rule-custom-message.md)                                                     | Allows redefining error messages from other ESLint rules that don't provide this functionality natively.                                              | ✅ 🇬🇧 |        |        |    |    |
| [sample-names](docs/rules/sample-names.md)                                                                   | Rename sample plugin class names                                                                                                                      | ✅ 🇬🇧 |        |        |    |    |
| [settings-tab/no-deprecated-display](docs/rules/settings-tab/no-deprecated-display.md)                       | Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later. |        | ✅ 🇬🇧 |        | 🔧 |    |
| [settings-tab/no-manual-html-headings](docs/rules/settings-tab/no-manual-html-headings.md)                   | Disallow using HTML heading elements for settings headings.                                                                                           | ✅ 🇬🇧 |        |        | 🔧 |    |
| [settings-tab/no-problematic-settings-headings](docs/rules/settings-tab/no-problematic-settings-headings.md) | Discourage anti-patterns in settings headings.                                                                                                        | ✅ 🇬🇧 |        |        | 🔧 |    |
| [settings-tab/prefer-setting-definitions](docs/rules/settings-tab/prefer-setting-definitions.md)             | Encourage PluginSettingTab subclasses to implement getSettingDefinitions() so settings appear in Obsidian 1.13+ settings search.                      |        | ✅ 🇬🇧 |        |    |    |
| [settings-tab/prefer-update-over-display](docs/rules/settings-tab/prefer-update-over-display.md)             | Prefer this.update() over this.display() to refresh a PluginSettingTab on Obsidian 1.13+.                                                             |        | ✅ 🇬🇧 |        | 🔧 |    |
| [settings-tab/require-display](docs/rules/settings-tab/require-display.md)                                   | Require a display() method on PluginSettingTab subclasses when minAppVersion is below 1.13.0.                                                         |        | ✅ 🇬🇧 |        |    |    |
| [ui/sentence-case](docs/rules/ui/sentence-case.md)                                                           | Enforce sentence case for UI strings                                                                                                                  |        | ✅ 🇬🇧 |        | 🔧 |    |
| [ui/sentence-case-json](docs/rules/ui/sentence-case-json.md)                                                 | Enforce sentence case for English JSON locale strings                                                                                                 |        | 🇬🇧   |        | 🔧 |    |
| [ui/sentence-case-locale-module](docs/rules/ui/sentence-case-locale-module.md)                               | Enforce sentence case for English TS/JS locale module strings                                                                                         |        | 🇬🇧   |        | 🔧 |    |
| [validate-license](docs/rules/validate-license.md)                                                           | Validate the structure of copyright notices in LICENSE files for Obsidian plugins.                                                                    |        | ✅ 🇬🇧 |        |    |    |
| [validate-manifest](docs/rules/validate-manifest.md)                                                         | Validate the structure of manifest.json for Obsidian plugins.                                                                                         |        | ✅ 🇬🇧 |        |    |    |
| [vault/iterate](docs/rules/vault/iterate.md)                                                                 | Avoid iterating all files to find a file by its path                                                                                                  |        | ✅ 🇬🇧 |        | 🔧 |    |

<!-- end auto-generated rules list -->


## UI sentence case

Checks UI strings for sentence case. The rule reports warnings but doesn't change text unless you run ESLint with `--fix` and enable `allowAutoFix`.

- Included at warn level in `recommended` config
- Extended locale checks available via `recommendedWithLocalesEn`
- By default allows CamelCase words like `AutoReveal`
- Set `enforceCamelCaseLower: true` to flag CamelCase as incorrect

### Usage (flat config)

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  // Or include English locale files (JSON and TS/JS modules)
  // ...obsidianmd.configs.recommendedWithLocalesEn,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },

    // Optional project overrides
    rules: {
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["YourBrand"],
          acronyms: ["OK"],
          enforceCamelCaseLower: true,
        },
      ],
    },
  },
]);
```

### Notes

- Hyphenated words: `Auto-Reveal` becomes `auto-reveal`
- Locale file patterns in `recommendedWithLocalesEn`: `en*.json`, `en*.ts`, `en*.js`, `en/**/*`

### Known limitations

Sentence detection may incorrectly split on abbreviations (Dr., Inc., etc.). Use single sentences or adjust rule options when needed.
