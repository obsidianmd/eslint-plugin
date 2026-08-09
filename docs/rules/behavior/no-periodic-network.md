# obsidianmd/behavior/no-periodic-network

📝 Detect periodic network calls via setInterval combined with fetch or requestUrl.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Rule details

This rule detects when `setInterval` is combined with network calls (`fetch` or `requestUrl`) inside the callback. This pattern may indicate periodic background data transmission.

Note: Named function references passed to `setInterval` are not resolved — this is a documented limitation.

## Examples

### Invalid

```js
setInterval(() => { fetch('/api'); }, 60000);

setInterval(function() { requestUrl({ url: '/api' }); }, 60000);

window.setInterval(() => { fetch('/api'); }, 60000);
```

### Valid

```js
setInterval(() => { console.log('tick'); }, 1000);

fetch('/api/data');

setInterval(pollServer, 1000);
```
