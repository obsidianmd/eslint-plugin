# obsidianmd/settings-tab/no-problematic-settings-headings

📝 Discourage anti-patterns in settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A settings heading, `new Setting(…).setName("…").setHeading()` with a string-literal name, inside a
class that extends `PluginSettingTab`, declared or as a class expression, including in its callbacks
and nested functions, whose name:

- contains the word "settings" or "options", ignoring case: every heading in a settings tab is
  about settings, so the word adds nothing. The message names the word. Reported without a fix;
  rename the heading (`"Advanced"` rather than `"Advanced settings"`). The word is needed, and not
  reported, where it is what a verb acts on, as in `"Export and import settings"`,
  `"Reset all settings"`, `"Back up your settings"` or `"Sync options"`, or is followed by that act,
  as in `"Settings backup"`. The verbs are export, import, reset, restore, back up, sync,
  synchronize, copy, save, load, share, transfer, migrate, clear, delete, revert, download and
  upload.
- is "General", at the top of the tab: keep general settings at the top without a heading. The fix
  removes the heading.
- is the plugin's name, from the `pluginName` option or else the `name` in `manifest.json`, at the
  top of the tab: the tab already carries it. The fix removes the heading.

A "General" or plugin-name heading is at the top of the tab when it is the first thing `display()`
adds to it: nothing before it in `display()` creates anything or calls anything other than
`empty()`, the class and attribute methods (`addClass()`, `setAttr()`, …) and `console` logging.
What runs before `display()` empties the tab, with `containerEl.empty()` or
`this.containerEl.empty()` as a statement of its own, does not count: it is not in the tab any more.
Lower down it starts a section of its own, and removing it would put that section's settings under
the heading before it, so it is not reported. Nor is one whose place cannot be told: in a loop, in a
callback or another function, or in a method other than `display()`.

The words are matched as whole words: "Subsettings" does not contain "settings". "General" and the
plugin's name must be the whole name, ignoring case, spaces, and the words "settings" and
"options" with the punctuation around them: `"General"`, `"General settings"` and, for a plugin
named Numerals, `"Numerals"` and `"Numerals: Settings"` are reported. The plugin's name is compared
whole, so for a plugin named Style Settings, `"Style Settings"` is reported and `"Style"` is not. A
heading that has the word among others names a section of its own and is not reported:
`"General appearance"`, or `"Inline Numerals"` for a plugin named Numerals, or `"Recurring tasks"`
for one named Tasks.

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
side effect such as `new Setting(containerEl.createDiv())`, is a suggestion. It removes the whole
heading setting, its description and tooltip with it, and its description says so ("Remove the
whole heading setting: the `new Setting(…)` statement and every call in it, including
`setDesc()`."). There is no fix or suggestion when the heading has a control (`addButton()`,
`addToggle()`, …) or another call, or when its value is used, as in
`const heading = new Setting(…)…setHeading()`. Rename the heading instead.

## Further reading

- [UI text - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text)

## Options

- **`pluginName`** (`string`, optional): The plugin name to check against. Defaults to `manifest.json` `name`. An empty name, or a `name` that is not a string, turns off the plugin-name check.
