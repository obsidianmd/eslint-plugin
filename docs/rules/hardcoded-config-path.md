# obsidianmd/hardcoded-config-path

📝 Disallow hardcoded `.obsidian` config paths. Use `Vault#configDir` instead.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A string literal that contains `.obsidian` as a path segment: `".obsidian"`, `".obsidian/plugins"`,
`"vault/.obsidian/workspace.json"`. Users can rename the configuration folder, so use
`this.app.vault.configDir` instead.

Not reported: `.obsidian` as part of a longer name or host (`".obsidian-cache"`, `".obsidianrc"`,
`"https://publish.obsidian.md/"`). Only plain string literals are checked, so a template literal such
as `` `${base}/.obsidian/plugins` `` is not reported.

The recommended config does not apply this rule to [test files](../configuration.md#test-files),
whose fixtures name `.obsidian` on purpose.
