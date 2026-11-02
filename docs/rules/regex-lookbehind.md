# obsidianmd/regex-lookbehind

📝 Using lookbehinds in Regex is not supported in some iOS versions.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A lookbehind, `(?<=…)` or `(?<!…)`, in a regular expression literal or in any string literal, so
`new RegExp("(?<!\\d)px")` is reported as well as `/(?<!\d)px/`. Safari on iOS before 16.4 cannot
parse lookbehinds: a regular expression literal it cannot parse stops the whole plugin from loading
there, and `new RegExp()` throws when it runs.
Rewrite the expression without the lookbehind, for example by matching the preceding text in a
group.

Nothing is reported when the plugin is desktop-only, which is read from `manifest.json` or the
`isDesktopOnly` option below. There is no fix.

Not reported, because they are not lookbehinds:

- `(?<name>…)` named groups, `\(?<=` with an escaped parenthesis, and `(?<=` inside a character
  class such as `[(?<=]`
- template literals, such as ``new RegExp(`(?<=${prefix})x`)``, which are not checked

## Further reading

- [Lookbehind in regular expressions - Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Lookbehind+in+regular+expressions)

## Options

- **`isDesktopOnly`** (`boolean`, optional): Whether the plugin is desktop-only. Defaults to `manifest.json` `isDesktopOnly`. Only a literal `true` there counts: a non-boolean value — `"false"`, `1`, `[]` — is read as *not* desktop-only, so the rule keeps reporting rather than being turned off by a malformed field.
