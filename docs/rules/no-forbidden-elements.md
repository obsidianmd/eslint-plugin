# obsidianmd/no-forbidden-elements

📝 Disallow attachment of forbidden elements to the DOM in Obsidian plugins.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Creating a `<style>` or `<link>` element, the two elements a plugin would use to load CSS, whether or
not it is attached afterwards:

- `document.createElement("style")` and `document.createElement("link")`
- `createEl("style")` and `createEl("link")` called on an element, such as
  `containerEl.createEl("style")` or `document.head.createEl("link")`

The tag name is matched in any case. Put the plugin's CSS in `styles.css` instead, which Obsidian
loads for you. The [community scanner](../configuration.md#community-plugin-scanner-configuration)
keeps this rule at `error`.
