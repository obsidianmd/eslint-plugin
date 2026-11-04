# obsidianmd/settings-tab/no-problematic-settings-headings

📝 Discourage anti-patterns in settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A settings heading, `new Setting(…).setName("…").setHeading()` with a string-literal name, inside a
class that extends `PluginSettingTab`, declared or as a class expression, including in its callbacks
and nested functions, whose name contains (ignoring case):

- "settings" or "options": every heading in a settings tab is about settings, so the word adds
  nothing. Reported without a fix; rename the heading.
- "general": keep general settings at the top without a heading. The fix removes the heading.
- the plugin's name, from the `pluginName` option or else the `name` in `manifest.json`: the tab
  already carries it. The fix removes the heading.

The name is that of the last `setName()` in the chain, since each one replaces the one before, and
it may come before or after `setHeading()`: `new Setting(…).setHeading().setName("General")` is
reported too.

Not reported: headings outside a settings tab, including those in a class nested in the tab (the
nearest enclosing class decides), a superclass written as a property access
(`obsidian.PluginSettingTab`), a name that is not a string literal (a template literal included), and
a name that a later `setName()` replaces, as in `.setName("General").setHeading().setName(label)`.

## Fixes and suggestions

The fix replaces the heading's whole statement with an empty one (`;`), which stays valid as the body
of an `if` and keeps the statements around it apart. It is applied only where the statement is just
the heading: `new Setting(…)`, `setName()`, `setHeading()` and `setClass()`, in any order after the
constructor, with literals, variables and property reads as arguments.

```ts
new Setting(containerEl).setName("General").setHeading().setClass("my-heading"); // fixed to ;
new Setting(containerEl).setHeading().setName("General"); // fixed to ;
```

Removing a heading that also has a description, tooltip or `setDisabled()`, or an argument with a
side effect such as `new Setting(containerEl.createDiv())`, is a suggestion. There is no fix or
suggestion when the heading has a control (`addButton()`, `addToggle()`, …) or another call, or when
its value is used, as in `const heading = new Setting(…)…setHeading()`. Rename the heading instead.

## Further reading

- [UI text - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text)

## Options

- **`pluginName`** (`string`, optional): The plugin name to check against. Defaults to `manifest.json` `name`.
