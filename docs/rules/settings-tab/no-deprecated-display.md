# obsidianmd/settings-tab/no-deprecated-display

📝 Disallow a leftover display() method on PluginSettingTab subclasses once getSettingDefinitions() is implemented and minAppVersion is 1.13.0 or later.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

A `display()` method (or `display` class field) on a settings tab that also implements
`getSettingDefinitions()`, once `minAppVersion` is 1.13.0 or later. Obsidian then renders the
declarative settings and never calls `display()`.

The fix removes the `display` member, including a trailing semicolon and its line. Below 1.13, or
without `getSettingDefinitions()`, `display()` still does the work and is not reported.

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
