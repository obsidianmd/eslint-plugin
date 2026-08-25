# obsidianmd/behavior/no-system-identity

📝 Detect reads of system identity information that could be used for fingerprinting.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects reads of system identity information such as `os.hostname()`, `os.userInfo()`, `os.networkInterfaces()`, and identity-related environment variables (`process.env.HOME`, `process.env.USERNAME`, `process.env.USER`, `process.env.USERPROFILE`).

## Examples

### Invalid

```js
const name = os.hostname();

const info = os.userInfo();

const ifaces = os.networkInterfaces();

const home = process.env.HOME;

const user = process.env.USERNAME;
```

### Valid

```js
const cpus = os.cpus();

const env = process.env.NODE_ENV;
```
