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
text, and with `allowAutoFix: true`, `--fix` rewrites the value as a valid JSON string. Values are
judged as in [`ui/sentence-case`](sentence-case.md): URLs, date formats such as `YYYY-MM-DD`, brand
names and "REST" written in capitals keep their casing, and text with inline code, HTML or
placeholders (`{{count}}`) is not checked. The options work as in
[`ui/sentence-case`](sentence-case.md#options).

Not reported: keys, array elements, non-string values, and files that are not English locale files,
such as `fr.json`, or `entries.json` and `english.json`, which only start with "en".

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

| Name                    | Description                                                                                       | Type     | Choices           |
| :---------------------- | :------------------------------------------------------------------------------------------------ | :------- | :---------------- |
| `acronyms`              | Acronyms that should remain uppercase.                                                            | String[] |                   |
| `allowAutoFix`          | Whether to enable auto-fixes for sentence case violations.                                        | Boolean  |                   |
| `brands`                | Brand names to preserve with their canonical casing.                                              | String[] |                   |
| `enforceCamelCaseLower` | Whether to force CamelCase/PascalCase tokens to lowercase.                                        | Boolean  |                   |
| `ignoreRegex`           | Regex patterns for strings to ignore entirely.                                                    | String[] |                   |
| `ignoreWords`           | Words to skip when applying sentence case.                                                        | String[] |                   |
| `mode`                  | Controls sentence case strictness; loose preserves CamelCase tokens while strict lowercases them. | String   | `loose`, `strict` |

<!-- end auto-generated rule options list -->
