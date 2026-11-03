# obsidianmd/commands/no-command-in-command-id

📝 Disallow using the word 'command' in a command ID.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The `id` of a command passed to `addCommand()` as an object literal, when it is a string literal that
contains "command" in any case, also inside a longer word such as `commander`:

```ts
this.addCommand({ id: "open-note-command", name: "Open note", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

Not reported: an ID built from a template literal or a variable, and a command object defined
elsewhere and passed to `addCommand()` by name.

Changing the ID of a command you already ship resets any hotkey your users assigned to it, so the
[community scanner](../../configuration.md#community-plugin-scanner-configuration) only checks this
for the most recently submitted plugins.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
