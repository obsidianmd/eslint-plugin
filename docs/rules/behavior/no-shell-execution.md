# obsidianmd/behavior/no-shell-execution

📝 Detect usage of child_process for shell command execution.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects imports of `child_process` and `node:child_process`, as well as standalone calls to `execSync()` and `spawnSync()`. Unlike `no-nodejs-modules`, this rule does not respect `Platform.isDesktop` guards — it always reports, since its purpose is behavior classification rather than platform safety.

## Examples

### Invalid

```js
import { exec } from 'child_process';

const cp = require('child_process');

const cp = await import('child_process');

execSync('ls');

spawnSync('ls');

// Still reported even with a platform guard
if (Platform.isDesktop) { const cp = await import('child_process'); }
```

### Valid

```js
import { Plugin } from 'obsidian';

const result = someFunction();

exec('command');
```
