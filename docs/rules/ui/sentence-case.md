# obsidianmd/ui/sentence-case

📝 Enforce sentence case for UI strings.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Checks UI text set from code, such as `setName`, `setDesc`, `setPlaceholder`, `new Notice(...)` and
command names, and reports text that is not in sentence case.

The rule is off in `recommended` and `recommendedWithLocalesEn`, because it reports too much
ordinary text to be on by default. 0.3.0 meant to turn it off, but it stayed on until 0.5.0. To use
it, turn it on yourself:

```js
{
  rules: {
    "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }],
  },
}
```

Some text keeps its casing, because it is data rather than prose:

- URLs, such as `https://obsidian.md/help`.
- Date and time formats, such as `YYYY-MM-DD` or `HH:mm`.
- "REST" written in capitals. It is also an ordinary word, so both "Use the REST API" and "Take a
  rest" pass.
- A placeholder that shows an example value: a single token with no spaces (`sk-123…`,
  `YYYY-MM-DD`), or text starting with "e.g." or "ex." (`e.g. My Vault`).

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
