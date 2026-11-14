# obsidianmd/commands/no-command-in-command-id

📝 Disallow using the word 'command' in a command ID.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

The `id` of a command passed to `addCommand()` as an object literal, when it is a string literal
whose first or last word is "command", in any case, as a redundant label. The key may be quoted
(`"id": …`):

```ts
this.addCommand({ id: "open-note-command", name: "Open note", callback }); // reported
this.addCommand({ id: "openNoteCommand", name: "Open note", callback }); // reported
this.addCommand({ id: "open-note", name: "Open note", callback });
```

An ID is an identifier rather than prose, so its words are what separators such as `-`, `_`, `:`,
`.` and `/` split it into, split again at camelCase humps: `openNoteCommand` and `exportPDFCommand`
both end in the word "command". It is reported only where at least two other words are left and
nowhere else in the ID has "command", and not where it is what the command acts on:

- a leading "command" before a word it describes, as in `command-palette-open` or
  `command-id-copy` (`palette`, `id`, `name`, `list`, `selector`, `history`, `line` and the like);
- a trailing "command" where the command has no `name` written out as a string, or one that has
  "command" as a word (see
  [no-command-in-command-name](no-command-in-command-name.md#what-is-reported)), as
  `{ id: "create-slash-command", name: "Create slash command" }` has: the ID then names a slash
  command, and with no name to read, the words of the ID cannot tell a label from the noun the
  command acts on. With a name that does without the word, as
  `{ id: "open-note-command", name: "Open note" }` has, it is reported;
- a trailing "command" after a word that makes it the object, as in `open-note-for-command`, or in
  an ID that starts with a verb that takes a command, as in `copy-uri-command` or
  `run-shell-command` (`run`, `execute`, `copy`, `select`, `insert`, `search` and the like);
- where the command's `name`, a string literal, has "command" as a word it needs, as
  `{ id: "insert-snippet-command", name: "Insert snippet for command" }` has.

Not reported, therefore: `raw-command`, `run-command`, `copy-command-id`, `open-command-selector`,
`commandPalette`, and `open-note-command` with no name or a name such as `t("open")`. A leading
"command", as in `command-open-note`, is reported whatever the name. Nor are "command" inside a longer word, as in `open-commander` or
`recommend-notes`, the plural, as in `list-commands`, an ID built from a template literal or a
variable, and a command object defined elsewhere and passed to `addCommand()` by name.

Changing the ID of a command you already ship resets any hotkey your users assigned to it, so the
[community scanner](../../configuration.md#community-plugin-scanner-configuration) only checks this
for the most recently submitted plugins.

## Suggestion

Your editor offers to remove the word "command" from the command ID, never `--fix`: a user who set
a hotkey for the command loses it, and `executeCommandById()` calls, `obsidian://` URIs and other
plugins that run the command by its old ID stop working:

```ts
this.addCommand({ id: "open-note-command", name: "Open note", callback }); // suggests id: "open-note"
this.addCommand({ id: "commandOpenNote", name: "Open note", callback }); // suggests id: "openNote"
```

It goes as the plugin ID does in
[no-plugin-id-in-command-id](no-plugin-id-in-command-id.md#suggestion): with the separator after
it, or the one before it at the end of the ID, at both ends, keeping a camelCase ID camelCase and
the string's quotes and escapes. Not offered where "command" is next to something other than a
separator or another word, as in `command#open-note`, or where another command in the same file has
that ID already.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)
