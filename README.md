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
  obsidianmd.configs.recommended,

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

|    | Name          |
| :- | :------------ |
| ✅  | `recommended` |

<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                                         | Description                                                                                                          | 🔧 |
| :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :- |
| [commands/no-command-in-command-id](docs/rules/commands/no-command-in-command-id.md)                         | Disallow using the word 'command' in a command ID.                                                                   |    |
| [commands/no-command-in-command-name](docs/rules/commands/no-command-in-command-name.md)                     | Disallow using the word 'command' in a command name.                                                                 |    |
| [commands/no-default-hotkeys](docs/rules/commands/no-default-hotkeys.md)                                     | Discourage providing default hotkeys for commands.                                                                   |    |
| [commands/no-plugin-id-in-command-id](docs/rules/commands/no-plugin-id-in-command-id.md)                     | Disallow including the plugin ID in a command ID.                                                                    |    |
| [commands/no-plugin-name-in-command-name](docs/rules/commands/no-plugin-name-in-command-name.md)             | Disallow including the plugin name in a command name.                                                                |    |
| [detach-leaves](docs/rules/detach-leaves.md)                                                                 | Don't detach leaves in onunload.                                                                                     | 🔧 |
| [hardcoded-config-path](docs/rules/hardcoded-config-path.md)                                                 | test                                                                                                                 |    |
| [no-plugin-as-component](docs/rules/no-plugin-as-component.md)                                               | Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks.                  |    |
| [no-sample-code](docs/rules/no-sample-code.md)                                                               | Disallow sample code snippets from the Obsidian plugin template.                                                     | 🔧 |
| [no-static-styles-assignment](docs/rules/no-static-styles-assignment.md)                                     | Disallow setting styles directly on DOM elements, favoring CSS classes instead.                                      |    |
| [no-tfile-tfolder-cast](docs/rules/no-tfile-tfolder-cast.md)                                                 | Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.                                     |    |
| [no-view-references-in-plugin](docs/rules/no-view-references-in-plugin.md)                                   | Disallow storing references to custom views directly in the plugin, which can cause memory leaks.                    |    |
| [object-assign](docs/rules/object-assign.md)                                                                 | Object.assign with two parameters instead of 3.                                                                      |    |
| [platform](docs/rules/platform.md)                                                                           | Disallow use of navigator API for OS detection                                                                       |    |
| [prefer-abstract-input-suggest](docs/rules/prefer-abstract-input-suggest.md)                                 | Disallow Liam's frequently copied `TextInputSuggest` implementation in favor of the built-in `AbstractInputSuggest`. |    |
| [prefer-file-manager-trash-file](docs/rules/prefer-file-manager-trash-file.md)                               | Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.                        |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md)                                                           | Using lookbehinds in Regex is not supported in some iOS versions                                                     |    |
| [sample-names](docs/rules/sample-names.md)                                                                   | Rename sample plugin class names                                                                                     |    |
| [settings-tab/no-manual-html-headings](docs/rules/settings-tab/no-manual-html-headings.md)                   | Disallow using HTML heading elements for settings headings.                                                          | 🔧 |
| [settings-tab/no-problematic-settings-headings](docs/rules/settings-tab/no-problematic-settings-headings.md) | Discourage anti-patterns in settings headings.                                                                       | 🔧 |
| [validate-manifest](docs/rules/validate-manifest.md)                                                         | Validate the structure of manifest.json for Obsidian plugins.                                                        |    |
| [vault-iterate](docs/rules/vault-iterate.md)                                                                 | Avoid iterating all files to find a file by its path<br/>                                                            | 🔧 |
| [vault/iterate](docs/rules/vault/iterate.md)                                                                 | Avoid iterating all files to find a file by its path<br/>                                                            | 🔧 |

<!-- end auto-generated rules list -->
