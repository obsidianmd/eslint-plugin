# obsidianmd/settings-tab/no-deprecated-display

📝 Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A `display()` method (or `display` class field) on a settings tab that also implements
`getSettingDefinitions()`, once `minAppVersion` is 1.13.0 or later. Obsidian then renders the
declarative settings and never calls `display()`.

Below 1.13, or without `getSettingDefinitions()`, `display()` still does the work and is not
reported. Neither is it when `getSettingDefinitions()` only returns an empty array
(`return [];`): Obsidian renders a tab from its definitions only when there are some, so
`display()` still renders that tab.

An editor suggestion removes the `display` member, including a trailing semicolon, a trailing `//`
comment and its line. `--fix` never removes it, because that is not always safe:

- With `obsidian` typings older than 1.13, `display()` is abstract, so the class no longer compiles
  without it. Upgrade the `obsidian` package first.
- When `getSettingDefinitions()` returns an empty array only sometimes, `display()` still renders the
  tab then.
- Imports, helpers and fields that only `display()` used are left unused; remove them with it.

Only a class that extends `PluginSettingTab` by that name is checked, declared or as a class
expression; an `abstract` class is skipped, and so is a superclass written as a property access
(`obsidian.PluginSettingTab`). The version comes from the `minAppVersion` option, or else from `manifest.json` in the directory
ESLint runs from. When neither gives a valid `x.y.z` version, the rule does nothing.

## Further reading

- [Migrate to declarative settings](https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings)

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
