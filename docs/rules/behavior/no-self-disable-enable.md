# obsidianmd/behavior/no-self-disable-enable

📝 Detect plugins that programmatically disable and re-enable themselves.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects when a plugin calls both `disablePlugin` and `enablePlugin` in the same file. This pattern is a known technique for executing newly downloaded code without user awareness by restarting the plugin after modifying its own files.

## Examples

### Invalid

```js
app.plugins.disablePlugin(this.manifest.id);
app.plugins.enablePlugin(this.manifest.id);
```

### Valid

```js
// Only disabling is fine
app.plugins.disablePlugin(this.manifest.id);

// Only enabling is fine
app.plugins.enablePlugin('some-id');
```
