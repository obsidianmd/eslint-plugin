# obsidianmd/settings-tab/no-problematic-settings-headings

📝 Discourage anti-patterns in settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

A settings heading, `new Setting(…).setName("…").setHeading()` with a string-literal name, inside a
class declaration that extends `PluginSettingTab`, whose name contains (ignoring case):

- "settings" or "options": every heading in a settings tab is about settings, so the word adds
  nothing. Reported without a fix; rename the heading.
- "general": keep general settings at the top without a heading. The fix removes the heading.
- the plugin's name, from the `pluginName` option or else the `name` in `manifest.json`: the tab
  already carries it. The fix removes the heading.

Not reported: headings outside a settings tab, and a name that is not a string literal.

## Further reading

- [UI text - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text)

## Options

- **`pluginName`** (`string`, optional): The plugin name to check against. Defaults to `manifest.json` `name`.
