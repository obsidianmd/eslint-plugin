# eslint-plugin-obsidianmd

> [!warning]
> This is not fully tested yet.

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

With the release of ESLint v9, the default configuration file is now `eslint.config.js`.

### Flat Config (`eslint.config.js`) - Recommended for ESLint v9+

To use the recommended configuration, add it to your `eslint.config.js` file. This will enable all the recommended rules.

```javascript
// eslint.config.js
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  // The recommended configuration
  ...obsidianmd.configs.recommended,

  // You can add your own configuration to override or add rules
  {
    rules: {
      // example: turn off a rule from the recommended set
      "obsidianmd/sample-names": "off",
      // example: add a rule not in the recommended set and set its severity
      "obsidianmd/prefer-file-manager-trash": "error",
    },
  },
];
```

### Legacy Config (`.eslintrc`)

<details>
<summary>Click here for ESLint v8 and older</summary>

To use the recommended configuration, extend it in your `.eslintrc` file:

```json
{
  "extends": ["plugin:obsidianmd/recommended"]
}
```

You can also override or add rules:

```json
{
  "extends": ["plugin:obsidianmd/recommended"],
  "rules": {
    "obsidianmd/sample-names": "off",
    "obsidianmd/prefer-file-manager-trash": "error"
  }
}
```

</details>

## Configurations

<!-- begin auto-generated configs list -->

|    | Name                       |
| :- | :------------------------- |
| ✅  | `recommended`              |
|    | `recommendedWithLocalesEn` |

<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                                         | Description                                                                                                          | 💼                                    | ⚠️                                    | 🔧 |
| :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :------------------------------------ | :- |
| [commands/no-command-in-command-id](docs/rules/commands/no-command-in-command-id.md)                         | Disallow using the word 'command' in a command ID.                                                                   | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [commands/no-command-in-command-name](docs/rules/commands/no-command-in-command-name.md)                     | Disallow using the word 'command' in a command name.                                                                 | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [commands/no-default-hotkeys](docs/rules/commands/no-default-hotkeys.md)                                     | Discourage providing default hotkeys for commands.                                                                   | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [commands/no-plugin-id-in-command-id](docs/rules/commands/no-plugin-id-in-command-id.md)                     | Disallow including the plugin ID in a command ID.                                                                    | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [commands/no-plugin-name-in-command-name](docs/rules/commands/no-plugin-name-in-command-name.md)             | Disallow including the plugin name in a command name.                                                                | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [detach-leaves](docs/rules/detach-leaves.md)                                                                 | Don't detach leaves in onunload.                                                                                     | ✅ ![badge-recommendedWithLocalesEn][] |                                       | 🔧 |
| [hardcoded-config-path](docs/rules/hardcoded-config-path.md)                                                 | test                                                                                                                 | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [no-forbidden-elements](docs/rules/no-forbidden-elements.md)                                                 | Disallow attachment of forbidden elements to the DOM in Obsidian plugins.                                            | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [no-plugin-as-component](docs/rules/no-plugin-as-component.md)                                               | Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks.                  | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [no-sample-code](docs/rules/no-sample-code.md)                                                               | Disallow sample code snippets from the Obsidian plugin template.                                                     | ✅ ![badge-recommendedWithLocalesEn][] |                                       | 🔧 |
| [no-static-styles-assignment](docs/rules/no-static-styles-assignment.md)                                     | Disallow setting styles directly on DOM elements, favoring CSS classes instead.                                      | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [no-tfile-tfolder-cast](docs/rules/no-tfile-tfolder-cast.md)                                                 | Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.                                     | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [no-view-references-in-plugin](docs/rules/no-view-references-in-plugin.md)                                   | Disallow storing references to custom views directly in the plugin, which can cause memory leaks.                    | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [object-assign](docs/rules/object-assign.md)                                                                 | Object.assign with two parameters instead of 3.                                                                      | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [platform](docs/rules/platform.md)                                                                           | Disallow use of navigator API for OS detection                                                                       | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [prefer-abstract-input-suggest](docs/rules/prefer-abstract-input-suggest.md)                                 | Disallow Liam's frequently copied `TextInputSuggest` implementation in favor of the built-in `AbstractInputSuggest`. | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [prefer-file-manager-trash-file](docs/rules/prefer-file-manager-trash-file.md)                               | Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.                        |                                       | ✅ ![badge-recommendedWithLocalesEn][] |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md)                                                           | Using lookbehinds in Regex is not supported in some iOS versions                                                     | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [sample-names](docs/rules/sample-names.md)                                                                   | Rename sample plugin class names                                                                                     | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [settings-tab/no-manual-html-headings](docs/rules/settings-tab/no-manual-html-headings.md)                   | Disallow using HTML heading elements for settings headings.                                                          | ✅ ![badge-recommendedWithLocalesEn][] |                                       | 🔧 |
| [settings-tab/no-problematic-settings-headings](docs/rules/settings-tab/no-problematic-settings-headings.md) | Discourage anti-patterns in settings headings.                                                                       | ✅ ![badge-recommendedWithLocalesEn][] |                                       | 🔧 |
| [ui/sentence-case](docs/rules/ui/sentence-case.md)                                                           | Enforce sentence case for UI strings                                                                                 |                                       | ✅ ![badge-recommendedWithLocalesEn][] | 🔧 |
| [ui/sentence-case-json](docs/rules/ui/sentence-case-json.md)                                                 | Enforce sentence case for English JSON locale strings                                                                |                                       |                                       | 🔧 |
| [ui/sentence-case-locale-module](docs/rules/ui/sentence-case-locale-module.md)                               | Enforce sentence case for English TS/JS locale module strings                                                        |                                       |                                       | 🔧 |
| [validate-license](docs/rules/validate-license.md)                                                           | Validate the structure of copyright notices in LICENSE files for Obsidian plugins.                                   |                                       |                                       |    |
| [validate-manifest](docs/rules/validate-manifest.md)                                                         | Validate the structure of manifest.json for Obsidian plugins.                                                        | ✅ ![badge-recommendedWithLocalesEn][] |                                       |    |
| [vault/iterate](docs/rules/vault/iterate.md)                                                                 | Avoid iterating all files to find a file by its path<br/>                                                            | ✅ ![badge-recommendedWithLocalesEn][] |                                       | 🔧 |

<!-- end auto-generated rules list -->


## UI sentence case

Checks UI strings for sentence case. The rule reports warnings but doesn't change text unless you run ESLint with `--fix` and enable `allowAutoFix`.

- Included at warn level in `recommended` config
- Extended locale checks available via `recommendedWithLocalesEn`
- By default allows CamelCase words like `AutoReveal`
- Set `enforceCamelCaseLower: true` to flag CamelCase as incorrect

### Usage (flat config)

```js
// eslint.config.js
import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  // Base Obsidian rules
  ...obsidianmd.configs.recommended,

  // Or include English locale files (JSON and TS/JS modules)
  // ...obsidianmd.configs.recommendedWithLocalesEn,

  // Optional project overrides
  {
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', {
        brands: ['YourBrand'],
        acronyms: ['OK'],
        enforceCamelCaseLower: true,
      }],
    },
  },
];
```

### Notes

- Hyphenated words: `Auto-Reveal` becomes `auto-reveal`
- Locale file patterns in `recommendedWithLocalesEn`: `en*.json`, `en*.ts`, `en*.js`, `en/**/*`

### Known limitations

Sentence detection may incorrectly split on abbreviations (Dr., Inc., etc.). Use single sentences or adjust rule options when needed.
