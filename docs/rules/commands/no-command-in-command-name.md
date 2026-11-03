# obsidianmd/commands/no-command-in-command-name

📝 Disallow using the word 'command' in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The `name` of a command passed to `addCommand()` as an object literal, when it is a string literal
that contains "command" in any case, also inside a longer word such as "Commander":

```ts
this.addCommand({ id: "open-note", name: "Open note command", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

Not reported: a name built from a template literal or a variable, and a command object defined
elsewhere and passed to `addCommand()` by name.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
