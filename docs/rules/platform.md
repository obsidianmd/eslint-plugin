# obsidianmd/platform

📝 Disallow use of navigator API for OS detection.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Reading `userAgent` or `platform` from `navigator` or `window.navigator` to tell which operating
system the plugin runs on. Obsidian's `Platform` API answers that directly, including whether it runs
on mobile:

```ts
if (navigator.userAgent.includes("Mac")) {} // reported
if (Platform.isMacOS) {} // use Platform instead
```

There is no fix. Other `navigator` properties, such as `navigator.clipboard`, are not reported, and
neither is `navigator.userAgentData`, a computed access such as `navigator["userAgent"]`, or the
navigator of another window, such as `activeWindow.navigator`.

## Further reading

- [Platform-specific features - Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific+features)
