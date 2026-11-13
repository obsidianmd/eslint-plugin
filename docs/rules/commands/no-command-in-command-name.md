# obsidianmd/commands/no-command-in-command-name

📝 Disallow using the word 'command' in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

The `name` of a command passed to `addCommand()` as an object literal, when it is a string literal
in which the word "command", in any case, is a redundant label rather than a word the name needs.
The key may be quoted (`"name": …`):

```ts
this.addCommand({ id: "open-note", name: "Command: open note", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note (command)", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

"command" is a label:

- at the start or the end, with a separator such as `:`, `-` with spaces, `|` or `/` between it and
  the rest, as in "Command: open note" or "Open note - command";
- in brackets at the start or the end, as in "[Command] open note" or "Open note (command)".

Not reported, therefore: "command" as the last word after only a space, as in "Run command",
"Create slash command", "Edit shell command" or "Open settings command": it may be what the command
acts on, a slash command or a shell command, and the words cannot tell that from a label. Nor is
"command" as what the command acts on elsewhere, as in "Copy URI for command"; "command" in the middle of the name or before
the next word, as in "Select and copy command ID", "Toggle command palette" or
"Command palette: open"; and a name of nothing but "command", as "Command" or "Command:". Only the
whole word counts: no letter or digit, in any script, may come right before or after it, so
"command" inside a longer word, as in "Open Commander" or "Command-line tools", and the plural, as
in "Show all commands", are not reported either. Nor are a name built from a template literal or a
variable, and a command object defined elsewhere and passed to `addCommand()` by name.

## Suggestion

Your editor offers to remove the word "command" from the command name, never `--fix`, since the
name users see changes:

```ts
this.addCommand({ id: "open-note", name: "Command: open note", callback }); // suggests "Open note"
this.addCommand({ id: "open-note", name: "Open note (command)", callback }); // suggests "Open note"
```

It goes as the plugin name does in
[no-plugin-name-in-command-name](no-plugin-name-in-command-name.md#suggestion), with the separator
next to it, every time it is there, and where it began with a capital, the rest starts with one too.
The string keeps its quotes and its escapes. Every name the rule reports has a suggestion.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
