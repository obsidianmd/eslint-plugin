# obsidianmd/detach-leaves

📝 Don't detach leaves in onunload.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

A `detachLeavesOfType()` call, on any object, made as a statement directly in the body of an
`onunload()` method:

```ts
onunload() {
  this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE); // reported
}
```

The fix removes the call. Detaching the leaves here makes them reopen in their default location the
next time the plugin loads, even if the user had moved them elsewhere.

Not reported: a call nested inside a block such as an `if`, a call made through a helper method, and
an `onunload` written as an arrow-function property.

## Further reading

- [Don't detach leaves in onunload - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Don't+detach+leaves+in+%60onunload%60)
