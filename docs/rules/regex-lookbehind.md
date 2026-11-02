# obsidianmd/regex-lookbehind

📝 Using lookbehinds in Regex is not supported in some iOS versions.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Further reading

- [Lookbehind in regular expressions - Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Lookbehind+in+regular+expressions)

## Options

- **`isDesktopOnly`** (`boolean`, optional): Whether the plugin is desktop-only. Defaults to `manifest.json` `isDesktopOnly`. Only a literal `true` there counts: a non-boolean value — `"false"`, `1`, `[]` — is read as *not* desktop-only, so the rule keeps reporting rather than being turned off by a malformed field.
