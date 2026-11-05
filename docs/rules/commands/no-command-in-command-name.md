# obsidianmd/commands/no-command-in-command-name

📝 Disallow using the word 'command' in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

The `name` of a command passed to `addCommand()` as an object literal, when it is a string literal
that contains the word "command", in any case. The key may be quoted (`"name": …`):

```ts
this.addCommand({ id: "open-note", name: "Open note command", callback }); // reported
this.addCommand({ id: "open-note", name: "Command: open note", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

Only the whole word counts: no letter or digit, in any script, may come right before or after it.
Not reported, therefore: "command" inside a longer word, as in "Open Commander" or "Recommended
settings", and the plural, as in "Show all commands", where the commands are what the command acts
on. Nor are a name built from a template literal or a variable, and a command object defined
elsewhere and passed to `addCommand()` by name.

## Suggestion

Your editor offers to remove the word "command" from the command name, never `--fix`, since the
name users see changes:

```ts
this.addCommand({ id: "open-note", name: "Open note command", callback }); // suggests "Open note"
this.addCommand({ id: "open-note", name: "Command: open note", callback }); // suggests "Open note"
```

It goes as the plugin name does in
[no-plugin-name-in-command-name](no-plugin-name-in-command-name.md#suggestion): at the start with
the separator after it, at the end with the separator before it, or in brackets, every time it is
there, and where it began with a capital, the rest starts with one too. The string keeps its quotes
and its escapes. Spaces alone separate it only at the end, as in "Open note command": at the start,
as in "Command palette: open", it is part of the sentence.

Not offered where nothing would be left, as for "Command" or "Command:", or where "command" is part
of the sentence, as in "Toggle command palette", "Command-line tools" or "Run command.".

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
