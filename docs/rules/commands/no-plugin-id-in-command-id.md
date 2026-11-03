# obsidianmd/commands/no-plugin-id-in-command-id

📝 Disallow including the plugin ID in a command ID.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The `id` of a command passed to `addCommand()` as an object literal, when it is a string literal that
contains the plugin ID anywhere, in any case. The plugin ID is the `pluginId` option, or else the
`id` in the `manifest.json` of the directory ESLint runs from:

```ts
// manifest.json: { "id": "word-tally", ... }
this.addCommand({ id: "word-tally-count", name: "Count words", callback }); // reported
this.addCommand({ id: "count", name: "Count words", callback });
```

Not reported: an ID built from a template literal or a variable, and a command object defined
elsewhere and passed to `addCommand()` by name.

Changing the ID of a command you already ship resets any hotkey your users assigned to it, so the
[community scanner](../../configuration.md#community-plugin-scanner-configuration) only checks this
for the most recently submitted plugins.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)

## Options

- **`pluginId`** (`string`, optional): The plugin ID to check against. Defaults to `manifest.json` `id`.
