# obsidianmd/behavior/no-electron-ipc

📝 Detect usage of Electron IPC for privileged inter-process communication.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects usage of Electron's IPC modules (`ipcRenderer`, `ipcMain`), which allow privileged inter-process communication outside the normal plugin sandbox.

## Examples

### Invalid

```js
import { ipcRenderer } from 'electron';

import { ipcMain } from 'electron';

electron.ipcRenderer.send('test');
```

### Valid

```js
import { Plugin } from 'obsidian';

const renderer = new Renderer();
```
