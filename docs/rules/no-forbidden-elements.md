# obsidianmd/no-forbidden-elements

📝 Disallow attachment of forbidden elements to the DOM in Obsidian plugins.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Creating a `<style>` or `<link>` element, the two elements a plugin would use to load CSS, whether or
not it is attached afterwards:

- `createElement("style")` and `createElement("link")` on a document: `document`, `activeDocument`,
  or a property ending in `.document`, `.activeDocument`, `.doc` or `.ownerDocument`, such as
  `window.document`, `activeWindow.document`, `el.doc` or `el.ownerDocument`
- `createEl("style")` and `createEl("link")` called on an element, such as
  `containerEl.createEl("style")` or `document.head.createEl("link")`
- Obsidian's global `createEl("style")` and `createEl("link")`, unless the file defines or imports
  its own `createEl`

The tag name is matched in any case. Only a literal tag name is checked, and a document is only
recognised by the expressions above: one stored in a variable first (`const doc = el.doc;
doc.createElement("style")`) is not followed, and an iframe's `contentDocument` is not the plugin's
document.

Put the plugin's CSS in `styles.css` instead, which Obsidian loads for you. The [community scanner](../configuration.md#community-plugin-scanner-configuration)
keeps this rule at `error`.
