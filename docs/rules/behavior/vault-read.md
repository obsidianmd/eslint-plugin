# obsidianmd/behavior/vault-read

📝 Detect reads of individual vault files via the Obsidian API.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects reads of vault files via `vault.read()`, `vault.cachedRead()`, and `adapter.read()`. This is an informational behavior classification rule — it does not suggest the code is wrong, but flags that the plugin reads vault files.

## Examples

### Invalid

```js
vault.read('test.md');

vault.cachedRead('test.md');

this.app.vault.read('test.md');

adapter.read('test.md');
```

### Valid

```js
file.read();

vault.create('test.md', 'content');
```
