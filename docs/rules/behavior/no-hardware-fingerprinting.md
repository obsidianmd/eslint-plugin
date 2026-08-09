# obsidianmd/behavior/no-hardware-fingerprinting

📝 Detect usage of hardware fingerprinting libraries like node-machine-id.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects usage of the `node-machine-id` library and its exported functions (`machineId`, `machineIdSync`), which collect unique hardware identifiers that can be used to fingerprint the user's machine.

## Examples

### Invalid

```js
import { machineIdSync } from 'node-machine-id';

const id = require('node-machine-id');

const id = machineIdSync();

const mod = await import('node-machine-id');
```

### Valid

```js
import { Plugin } from 'obsidian';

const id = generateId();
```
