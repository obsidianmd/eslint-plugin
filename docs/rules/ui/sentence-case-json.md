# obsidianmd/ui/sentence-case-json

📝 Enforce sentence case for English JSON locale strings.

⚠️ This rule _warns_ in the 🇬🇧 `recommendedWithLocalesEn` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

Checks the string values of an English locale JSON file — `en.json`, `en-US.json`, `en_GB.json`,
`en.messages.json`, or any `.json` under a directory named so, such as `en/` or `en-US/`, with `en`
in any case — and reports those not in sentence case. Keys are not checked, and neither are array
elements. Values in nested objects are.

```json
{
  "settings": {
    "title": "Open Settings"
  }
}
```

Here `"Open Settings"` is reported; `"Open settings"` would pass. The message gives the expected
text, and with `allowAutoFix: true`, `--fix` changes the case of the letters that need it and keeps
every escape as written; a value where such a letter is written as an escape (`\u0053`) is reported
without a fix. Values are judged as in [`ui/sentence-case`](sentence-case.md): URLs, date formats
such as `YYYY-MM-DD`, brand names, acronyms and words in capitals, weekdays, months, languages, key
names and the pronoun "I" keep their casing, a brand that is
also an ordinary word, such as "Windows", may be written as that word ("Close all windows"), and
text with inline code, HTML or placeholders (`{{count}}`) is not checked. The options work as in
[`ui/sentence-case`](sentence-case.md#options).

Not reported: keys, array elements, non-string values, and files that are not English locale files,
such as `fr.json`, or `entries.json` and `english.json`, which only start with "en". Only the part
of the path inside ESLint's working directory counts, as for the config's globs, so a folder above
the project named `en`, as in `C:\Users\en\plugin\src\settings.json`, does not make the files
under it locale files.

The rule reads the file with the `json/json` language from `@eslint/json`, which
`recommendedWithLocalesEn` sets up for these files, the same files the rule takes for English locale
files. To enable it without that config, do the same:

```js
import json from "@eslint/json";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: [
      "**/[eE][nN].json",
      "**/[eE][nN][._-]?*.json",
      "**/[eE][nN]/**/*.json",
      "**/[eE][nN][._-]?*/**/*.json",
    ],
    language: "json/json",
    plugins: { json, obsidianmd },
    rules: { "obsidianmd/ui/sentence-case-json": "warn" },
  },
];
```

## Options

<!-- begin auto-generated rule options list -->

| Name                     | Description                                                                                       | Type     | Choices           |
| :----------------------- | :------------------------------------------------------------------------------------------------ | :------- | :---------------- |
| `acronyms`               | Acronyms that should remain uppercase, in addition to the built-in ones.                          | String[] |                   |
| `allowAutoFix`           | Whether to enable auto-fixes for sentence case violations.                                        | Boolean  |                   |
| `brands`                 | Brand names to preserve with their canonical casing.                                              | String[] |                   |
| `enforceCamelCaseLower`  | Whether to force CamelCase/PascalCase tokens to lowercase.                                        | Boolean  |                   |
| `ignoreRegex`            | Regex patterns for strings to ignore entirely.                                                    | String[] |                   |
| `ignoreWords`            | Words to skip when applying sentence case.                                                        | String[] |                   |
| `mode`                   | Controls sentence case strictness; loose preserves CamelCase tokens while strict lowercases them. | String   | `loose`, `strict` |
| `replaceDefaultAcronyms` | Whether `acronyms` replaces the built-in acronyms instead of adding to them.                      | Boolean  |                   |

<!-- end auto-generated rule options list -->
