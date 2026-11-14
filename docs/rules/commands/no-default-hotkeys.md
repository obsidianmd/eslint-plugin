# obsidianmd/commands/no-default-hotkeys

📝 Discourage providing default hotkeys for commands.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A `hotkeys` property in a command passed to `addCommand()` as an object literal, unless its value is
an empty array (`hotkeys: []`, also `[] as Hotkey[]`), which sets no hotkey. The key may be quoted
(`"hotkeys": …`):

```ts
this.addCommand({ id: "open-note", name: "Open note", hotkeys: [{ modifiers: ["Mod"], key: "O" }], callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

Users assign their own hotkeys under Settings → Hotkeys. Not reported: a command object defined
elsewhere and passed to `addCommand()` by name.

## Suggestion

Your editor offers to remove the `hotkeys` property, never `--fix`, since a user who has the
default hotkey and has not set one of their own loses it. The property goes with its comma, and
the object keeps its layout: a property on a line of its own goes with its line, one on a line with
others with the space after it, and the last one without a trailing comma with the comma before it.
An object with nothing else becomes `{}`.

```ts
this.addCommand({
    id: "open-note",
    name: "Open note",
    hotkeys: [{ modifiers: ["Mod"], key: "O" }], // suggests removing this line
    callback,
});
```

Comments next to the property stay where they are, on their own line or after the property before
it. Not offered where a comment is inside the property or between it and its comma, as in
`hotkeys: [/* Mod+O */ OPEN_HOTKEY]`, since it would go with the property.

## Further reading

- [Avoid setting default hotkeys - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid%20setting%20a%20default%20hotkey%20for%20commands)
