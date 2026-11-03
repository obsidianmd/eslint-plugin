# obsidianmd/settings-tab/require-display

📝 Require a display() method on PluginSettingTab subclasses when minAppVersion is below 1.13.0.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A settings tab without a `display()` method (or a `display` class field) while `minAppVersion` is
below 1.13.0, the first version that renders declarative settings from `getSettingDefinitions()`.
Before 1.13 such a tab shows nothing.

```ts
// minAppVersion 1.12.0
class MySettingTab extends PluginSettingTab {
  getSettingDefinitions() { return [/* … */]; } // reported: no display() for Obsidian < 1.13
}
```

Only a class that extends `PluginSettingTab` by that name is checked, declared or as a class
expression; an `abstract` class is skipped, and so is a superclass written as a property access
(`obsidian.PluginSettingTab`). The version comes from the `minAppVersion` option, or else from `manifest.json` in the directory
ESLint runs from. When neither gives a valid `x.y.z` version, the rule does nothing. There is no fix: add `display()`, or raise `minAppVersion` to 1.13.0.

## Further reading

- [Migrate to declarative settings](https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings)

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
