# obsidianmd/settings-tab/prefer-setting-definitions

📝 Encourage PluginSettingTab subclasses to implement getSettingDefinitions() so settings appear in Obsidian 1.13+ settings search.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A settings tab that does not implement `getSettingDefinitions()` (as a method or a class field),
whatever the plugin's `minAppVersion`. Without it, the tab's settings do not appear in the settings
search of Obsidian 1.13 and later. There is no fix; see the migration guide below.

Only a class that extends `PluginSettingTab` by that name is checked, declared or as a class
expression; an `abstract` class is skipped, and so is a superclass written as a property access
(`obsidian.PluginSettingTab`).

## Further reading

- [Migrate to declarative settings](https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings)
