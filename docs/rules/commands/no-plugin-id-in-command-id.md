# obsidianmd/commands/no-plugin-id-in-command-id

📝 Disallow including the plugin ID in a command ID.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

The `id` of a command passed to `addCommand()` as an object literal, when it is a string literal that
contains the words of the plugin ID, together and in order, in any case; the key may be quoted
(`"id": …`). The plugin ID is the `pluginId` option, or else the `id` in the `manifest.json` of the
directory ESLint runs from:

```ts
// manifest.json: { "id": "word-tally", ... }
this.addCommand({ id: "word-tally-count", name: "Count words", callback }); // reported
this.addCommand({ id: "wordTallyCount", name: "Count words", callback }); // reported
this.addCommand({ id: "count", name: "Count words", callback });
```

IDs are identifiers rather than prose, so their words are what separators such as `-`, `_`, `:`,
`.` and `/` split them into, split again at camelCase humps: `word-tally`, `word_tally:count` and
`wordTallyCount` all hold the words "word" and "tally". Not reported, therefore: the plugin ID
inside a longer word, so a plugin with the ID `git` does not get `open-digital-garden` or `legit`
reported, and its words apart or changed, as in `word-count-tally` or `word-tallies`. Nor are an ID
built from a template literal or a variable, and a command object defined elsewhere and passed to
`addCommand()` by name. With no plugin ID to compare with, because there is neither the option nor
a `manifest.json`, or with one that has no words, such as `-`, nothing is reported.

Changing the ID of a command you already ship resets any hotkey your users assigned to it, so the
[community scanner](../../configuration.md#community-plugin-scanner-configuration) only checks this
for the most recently submitted plugins.

## Suggestion

Your editor offers to remove the plugin ID from the command ID, never `--fix`, since a user who set
a hotkey for the command loses it. Obsidian puts the plugin ID in front of the command ID itself:

```ts
// manifest.json: { "id": "word-tally", ... }
this.addCommand({ id: "word-tally:count", name: "Count words", callback }); // suggests id: "count"
this.addCommand({ id: "count-word-tally", name: "Count words", callback }); // suggests id: "count"
this.addCommand({ id: "wordTallyCountAll", name: "Count all words", callback }); // suggests id: "countAll"
```

The separator after the plugin ID goes with it, or the one before it at the end of the command ID:
`-`, `_`, `:`, `.`, `/` or a space, all of them where there are several. Every occurrence of the
plugin ID goes. A camelCase ID stays camelCase: where the plugin ID began it, the next word now
does, in lower case. The string keeps its quotes and its escapes.

Not offered where:

- nothing would be left, as for `word-tally` or `word-tally:`;
- the plugin ID is next to something other than a separator or another word, as in
  `word-tally#count`;
- another command in the same file has that ID already: an object passed to `addCommand()`, or
  any other object literal with an `id` and a `name`, such as a command in an array. Two commands
  with one ID would not both be there in Obsidian. A command in another file is not checked.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)

## Options

- **`pluginId`** (`string`, optional): The plugin ID to check against. Defaults to `manifest.json` `id`.
