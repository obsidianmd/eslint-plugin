# eslint-plugin-obsidian

> [!warning]
> This is not ready to be used yet.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-obsidian`:

```sh
npm install eslint-plugin-obsidian --save-dev
```

## Usage

Add `obsidian` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "obsidian"
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

| Name                                               | Description                                     | 💼 | 🔧 |
| :------------------------------------------------- | :---------------------------------------------- | :- | :- |
| [commands](docs/rules/commands.md)                 | test                                            | ✅  |    |
| [detach-leaves](docs/rules/detach-leaves.md)       | test                                            | ✅  | 🔧 |
| [object-assign](docs/rules/object-assign.md)       | Object.assign with two parameters instead of 3. | ✅  |    |
| [regex-lookbehind](docs/rules/regex-lookbehind.md) | Using lookbehinds in Regex                      | ✅  |    |
| [sample-names](docs/rules/sample-names.md)         | Rename sample plugin class names                | ✅  |    |
| [sentence-case](docs/rules/sentence-case.md)       | Use sentence case in UI                         | ✅  |    |
| [settings-tab](docs/rules/settings-tab.md)         | Use sentence case in UI                         | ✅  |    |

<!-- end auto-generated rules list -->


