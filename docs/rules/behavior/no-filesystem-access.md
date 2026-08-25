# obsidianmd/behavior/no-filesystem-access

📝 Detect usage of the Node.js fs module for direct filesystem access outside the Obsidian vault API.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects imports of Node.js `fs`, `node:fs`, `fs/promises`, and `node:fs/promises` modules. Unlike `no-nodejs-modules`, this rule does not respect `Platform.isDesktop` guards — it always reports, since its purpose is behavior classification rather than platform safety.

## Examples

### Invalid

```js
import fs from 'fs';

import { readFile } from 'fs/promises';

const fs = require('fs');

const fs = await import('fs');

// Still reported even with a platform guard
if (Platform.isDesktop) { const fs = await import('fs'); }
```

### Valid

```js
import { Plugin } from 'obsidian';

import path from 'path';

const data = vault.read('test.md');
```
