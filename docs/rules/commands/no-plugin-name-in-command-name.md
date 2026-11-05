# obsidianmd/commands/no-plugin-name-in-command-name

📝 Disallow including the plugin name in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

The `name` of a command passed to `addCommand()` as an object literal, when it is a string literal
that contains the plugin name as whole words, in any case; the key may be quoted (`"name": …`).
The plugin name is the `pluginName` option, or else the `name` in the `manifest.json` of the
directory ESLint runs from:

```ts
// manifest.json: { "name": "Word Tally", ... }
this.addCommand({ id: "count", name: "Word Tally: Count words", callback }); // reported
this.addCommand({ id: "count", name: "Count words (word tally)", callback }); // reported
this.addCommand({ id: "count", name: "Count words", callback });
```

Whole words means no letter or digit, in any script, right before or after the plugin name, so a
plugin named "Git" gets "Commit with Git" and "Git: pull" reported but not "Open digital garden".
The words of a plugin name of several words may be separated by any whitespace; the name is
otherwise matched as written, punctuation included.

Not reported: a name built from a template literal or a variable, and a command object defined
elsewhere and passed to `addCommand()` by name. With no plugin name to compare with, because there
is neither the option nor a `manifest.json`, or with a blank one, nothing is reported.

## Suggestion

Your editor offers to remove the plugin name from the command name, which Obsidian shows after the
plugin name already, as in "Word Tally: Count words". It is a suggestion, never `--fix`, since the
name users see changes:

```ts
// manifest.json: { "name": "Word Tally", ... }
this.addCommand({ id: "count", name: "Word Tally: Count words", callback }); // suggests "Count words"
this.addCommand({ id: "count", name: "Count words (Word Tally)", callback }); // suggests "Count words"
this.addCommand({ id: "pdf", name: "Word Tally - pdf export", callback }); // suggests "PDF export"
```

It removes the plugin name, matched as the rule matches it, where it labels the command:

- at the start, with the separator after it: `:`, `|`, `/`, `>`, `»`, `›`, `→`, `·`, `•`, `–` or
  `—` with or without spaces, `-` with spaces, or only spaces before a word that starts with a
  capital, as in "Fit Sync";
- at the end, with the separator before it, the same ones except spaces alone;
- in brackets, `(…)` or `[…]`, at the start or the end.

Every occurrence goes. Where the plugin name at the start began with a capital, the name that is
left starts the way [ui/sentence-case](../ui/sentence-case.md) would have it: "Open note",
"PDF export", "iOS sync". That only raises letters of the first word: "Open Recent Files" stays as it
is, for ui/sentence-case to report. The string keeps its quotes and its escapes.

Not offered where:

- nothing would be left, as for "Word Tally" or "Word Tally:";
- only spaces separate the plugin name at the start from a word in lower case, as in "Zoom in" of
  the plugin "Zoom" or "Git commit": the plugin name is then a word of the sentence, and "In" would
  mean nothing;
- the plugin name is part of the sentence, where the rest would not read or would mean something
  else: "Open Word Tally settings", "Count with Word Tally", "Word Tally-based count",
  "Word Tally's settings", "Count words (for Word Tally)";
- the rest would start or end with a separator or a bracket, as for "Word Tally: - count";
- the letter to capitalize is written as an escape, as in `"Word Tally: \u0063ount words"`.

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)

## Options

- **`pluginName`** (`string`, optional): The plugin name to check against. Defaults to `manifest.json` `name`.
