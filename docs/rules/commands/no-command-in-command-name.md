# obsidianmd/commands/no-command-in-command-name

📝 Disallow using the word 'command' in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

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

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
