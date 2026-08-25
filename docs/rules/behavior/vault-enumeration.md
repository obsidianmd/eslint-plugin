# obsidianmd/behavior/vault-enumeration

📝 Detect enumeration of all files in the vault.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects enumeration of all vault files via `vault.getFiles()`, `vault.getAllLoadedFiles()`, `vault.recurseChildren()`, and `*.getMarkdownFiles()`. This gives the plugin access to every file path in the vault.

## Examples

### Invalid

```js
vault.getFiles();

vault.getAllLoadedFiles();

vault.recurseChildren(folder);

this.app.vault.getMarkdownFiles();
```

### Valid

```js
vault.read('test.md');

vault.getAbstractFileByPath('test.md');
```
