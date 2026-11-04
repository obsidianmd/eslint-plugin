# obsidianmd/commands/no-default-hotkeys

📝 Discourage providing default hotkeys for commands.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A `hotkeys` property, whatever its value (an empty array too), in a command passed to `addCommand()`
as an object literal. The key may be quoted (`"hotkeys": …`):

```ts
this.addCommand({ id: "open-note", name: "Open note", hotkeys: [{ modifiers: ["Mod"], key: "O" }], callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

Users assign their own hotkeys under Settings → Hotkeys. Not reported: a command object defined
elsewhere and passed to `addCommand()` by name.

## Further reading

- [Avoid setting default hotkeys - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid%20setting%20a%20default%20hotkey%20for%20commands)
