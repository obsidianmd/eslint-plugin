# obsidianmd/behavior/clipboard-access

📝 Detect access to the system clipboard.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects access to the system clipboard via `navigator.clipboard`, `electron.clipboard`, or `remote.clipboard`. Clipboard access may expose content copied from outside Obsidian.

## Examples

### Invalid

```js
navigator.clipboard.writeText('text');

navigator.clipboard.readText();

electron.clipboard.readText();

remote.clipboard.writeText('text');
```

### Valid

```js
navigator.userAgent;

const clipboard = new MyClipboard();
```
