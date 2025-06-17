# eslint-plugin-obsidianmd

> [!warning]
> This is not ready to be used in production yet.

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

Add `obsidianmd` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "obsidianmd"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "obsidian/rule-name": 2
    }
}
```



## Configurations

<!-- begin auto-generated configs list -->

|     | Name          |
| :-- | :------------ |
| ✅  | `recommended` |

<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                       | Description                                                                                         | 💼 | 🔧 |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :- | :- |
| [commands](docs/rules/commands.md)                                         | Command guidelines                                                                                  | ✅  |    |
| [detach-leaves](docs/rules/detach-leaves.md)                               | Don't detach leaves in onunload.                                                                    | ✅  | 🔧 |
| [hardcoded-config-path](docs/rules/hardcoded-config-path.md)               | test                                                                                                | ✅  |    |
| [no-plugin-as-component](docs/rules/no-plugin-as-component.md)             | Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks. | ✅  |    |
| [no-static-styles-assignment](docs/rules/no-static-styles-assignment.md)   | Disallow setting styles directly on DOM elements, favoring CSS classes instead.                     | ✅  |    |
| [no-tfile-tfolder-cast](docs/rules/no-tfile-tfolder-cast.md)               | Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.                    | ✅  |    |
| [no-view-references-in-plugin](docs/rules/no-view-references-in-plugin.md) | Disallow storing references to custom views directly in the plugin, which can cause memory leaks.   | ✅  |    |
| [object-assign](docs/rules/object-assign.md)                               | Object.assign with two parameters instead of 3.                                                     | ✅  |    |
| [platform](docs/rules/platform.md)                                         | Disallow use of navigator API for OS detection                                                      | ✅  |    |
| [prefer-file-manager-trash](docs/rules/prefer-file-manager-trash.md)       | Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.       |    |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md)                         | Using lookbehinds in Regex is not supported in some iOS versions                                    | ✅  |    |
| [sample-names](docs/rules/sample-names.md)                                 | Rename sample plugin class names                                                                    | ✅  |    |
| [settings-tab](docs/rules/settings-tab.md)                                 | Discourage common anti-patterns in plugin settings tabs.                                            | ✅  | 🔧 |
| [validate-manifest](docs/rules/validate-manifest.md)                       | Validate the structure of manifest.json for Obsidian plugins.                                       | ✅  |    |
| [vault-iterate](docs/rules/vault-iterate.md)                               | Avoid iterating all files to find a file by its path<br/>                                           | ✅  | 🔧 |

<!-- end auto-generated rules list -->
