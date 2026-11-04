# obsidianmd/hardcoded-config-path

📝 Disallow hardcoded `.obsidian` config paths. Use `Vault#configDir` instead.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A string literal or template literal that contains `.obsidian` as a path segment: `".obsidian"`,
`".obsidian/plugins"`, `"vault/.obsidian/workspace.json"`, `` `${base}/.obsidian/plugins` ``,
`` `.obsidian/${file}` ``. Paths with backslashes count too, and so does text, as in
`"Your settings are in .obsidian."`. Users can rename the configuration folder, so use
`this.app.vault.configDir` instead.

Not reported:

- `.obsidian` as part of a longer name or host: `".obsidian-cache"`, `".obsidianrc"`, `".obsidian2"`,
  `".obsidian.vimrc"` (a file in the vault root), `"https://publish.obsidian.md/"`
- in a template literal, `.obsidian` right after or before a `${…}` placeholder, such as
  `` `${dir}.obsidian` `` or `` `.obsidian${suffix}` ``, since the placeholder may be part of the same
  name. Write the separator out, as in `` `${dir}/.obsidian` ``, and it is reported

The recommended config does not apply this rule to [test files](../configuration.md#test-files),
whose fixtures name `.obsidian` on purpose.
