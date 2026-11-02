# obsidianmd/ui/sentence-case-json

📝 Enforce sentence case for English JSON locale strings.

⚠️ This rule _warns_ in the 🇬🇧 `recommendedWithLocalesEn` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Checks the string values of an English locale JSON file — `en.json`, `en-US.json`, `en_GB.json`, or
any `.json` under an `en/` directory — and reports those not in sentence case. Keys are not checked,
and neither are array elements. Values in nested objects are.

```json
{
  "settings": {
    "title": "Open Settings"
  }
}
```

Here `"Open Settings"` is reported; `"Open settings"` would pass. With `allowAutoFix: true`,
`--fix` rewrites it. URLs, date formats such as `YYYY-MM-DD`, and "REST" written in capitals keep
their casing.

The rule reads the file with the `json/json` language from `@eslint/json`, which
`recommendedWithLocalesEn` sets up for these files. To enable it without that config, do the same:

```js
import json from "@eslint/json";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: ["**/en.json", "**/en*.json", "**/en/**/*.json"],
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
