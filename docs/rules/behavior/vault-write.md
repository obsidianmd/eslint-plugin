# obsidianmd/behavior/vault-write

📝 Detect writes or modifications to vault files via the Obsidian API.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects writes and modifications to vault files via `vault.create()`, `vault.modify()`, `vault.delete()`, `vault.rename()`, `vault.copy()`, `vault.trash()`, and `adapter.write()`. This is an informational behavior classification rule.

## Examples

### Invalid

```js
vault.create('test.md', 'content');

vault.modify(file, 'new content');

vault.delete(file);

vault.rename(file, 'new.md');

adapter.write('path', 'data');
```

### Valid

```js
vault.read('test.md');

vault.getAbstractFileByPath('test.md');
```
