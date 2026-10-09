# obsidianmd/behavior/no-local-storage

📝 Detect usage of localStorage or sessionStorage instead of the Obsidian plugin data APIs.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects usage of `localStorage` and `sessionStorage` for data persistence. Obsidian plugins should use the plugin data APIs (`loadData`/`saveData`) instead.

## Examples

### Invalid

```js
localStorage.setItem('key', 'value');

localStorage.getItem('key');

sessionStorage.setItem('key', 'value');

window.localStorage.setItem('key', 'value');
```

### Valid

```js
this.plugin.loadData();

localStorage.length;
```
