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

|    | Name          |
| :- | :------------ |
| ✅  | `recommended` |

<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                         | Description                                                                      | 💼 | 🔧 |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------- | :- | :- |
| [commands](docs/rules/commands.md)                           | Command guidelines                                                               | ✅  |    |
| [detach-leaves](docs/rules/detach-leaves.md)                 | Don't detach leaves in onunload.                                                 | ✅  | 🔧 |
| [hardcoded-config-path](docs/rules/hardcoded-config-path.md) | test                                                                             | ✅  |    |
| [no-tfile-tfolder-cast](docs/rules/no-tfile-tfolder-cast.md) | Disallow type casting to TFile or TFolder, suggesting instanceof checks instead. | ✅  |    |
| [object-assign](docs/rules/object-assign.md)                 | Object.assign with two parameters instead of 3.                                  | ✅  |    |
| [platform](docs/rules/platform.md)                           | Disallow use of navigator API for OS detection                                   | ✅  |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md)           | Using lookbehinds in Regex is not supported in some iOS versions                 | ✅  |    |
| [sample-names](docs/rules/sample-names.md)                   | Rename sample plugin class names                                                 | ✅  |    |
| [settings-tab](docs/rules/settings-tab.md)                   | Discourage common anti-patterns in plugin settings tabs.                         | ✅  | 🔧 |
| [vault-iterate](docs/rules/vault-iterate.md)                 | Avoid iterating all files to find a file by its path<br/>                        | ✅  | 🔧 |

<!-- end auto-generated rules list -->
