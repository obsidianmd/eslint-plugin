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

Detaching the leaves here makes them reopen in their default location the next time the plugin
loads, even if the user had moved them elsewhere.

The method may be written `onunload()`, `"onunload"()` or `["onunload"]()`. Not reported: a call
nested inside a block such as an `if`, a call made through a helper method, an `onunload` written as
an arrow-function property, and a method whose computed name is not a string literal, such as
`[name]()`, which is named by whatever `name` holds.

### Fix

The fix removes the call together with its line. When nothing else is left in `onunload()`, the
method goes too, provided the class extends Obsidian's `Plugin` directly (`Plugin` or
`obsidian.Plugin` imported from `"obsidian"`): `Plugin` inherits `onunload()` from `Component`, where
it does nothing, so removing the method changes nothing.

```ts
// Before
export default class MyPlugin extends Plugin {
  async onload() { /* … */ }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
  }
}

// After --fix
export default class MyPlugin extends Plugin {
  async onload() { /* … */ }
}
```

Otherwise the method stays, with an empty body `{}`, or with just the comments its body held: when
the class extends a class of your own, whose `onunload()` the method overrides; when a comment is
in, above or after the method, as the fix removes no comment outside the call; for an `async`,
`static`, computed or decorated `onunload()`, one with parameters, or one with overloads; in a
class with another member whose computed name may be `onunload` (`[KEY]() {}` with `KEY` imported),
which would run in its place; and for one that follows a class field with no semicolon after it,
unless it is the class's last member, as the next member could then continue the field.
`@typescript-eslint/no-empty-function`, if you enable it,
reports the empty method: remove it yourself, or say in a comment why it is empty.

## Further reading

- [Don't detach leaves in onunload - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Don't+detach+leaves+in+%60onunload%60)
