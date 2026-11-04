# obsidianmd/commands/no-plugin-name-in-command-name

📝 Disallow including the plugin name in a command name.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

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

## Further reading

- [Commands - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Commands)

## Options

- **`pluginName`** (`string`, optional): The plugin name to check against. Defaults to `manifest.json` `name`.
