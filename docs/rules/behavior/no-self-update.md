# obsidianmd/behavior/no-self-update

📝 Detect plugins that appear to overwrite their own files by extracting an archive.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule flags plugins that combine references to plugin files (`main.js`, `manifest.json`, `styles.css`), file-write operations, and zip/archive libraries. This combination indicates a self-update mechanism that bypasses Obsidian's official plugin update process.

## Examples

### Invalid

```js
import AdmZip from 'adm-zip';

const f = "main.js";
writeFileSync(f, data);
```

### Valid

```js
// Only referencing a file name is fine
const f = "main.js";

// Only writing files is fine
writeFileSync(path, data);

// Only importing a zip library is fine
import AdmZip from 'adm-zip';
```
