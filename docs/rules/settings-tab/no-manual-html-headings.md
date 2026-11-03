# obsidianmd/settings-tab/no-manual-html-headings

📝 Disallow using HTML heading elements for settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

A heading element (`h1` to `h6`) created with `createEl()` on an element, such as
`containerEl.createEl("h2", { text: "Advanced" })`, inside a class declaration that extends
`PluginSettingTab`. Obsidian's setting headings keep the settings UI consistent:

```ts
new Setting(containerEl).setName("Advanced").setHeading();
```

The fix rewrites the call to that form, taking the heading text from a string-literal `text` option.
Other options, such as `cls`, are not carried over, and the result is a `Setting`, not the heading
element, so review the fix where the call's return value is used. Headings created outside a
settings tab are not reported.

## Further reading

- [UI text - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text)
