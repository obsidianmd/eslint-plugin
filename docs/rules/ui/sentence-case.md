# obsidianmd/ui/sentence-case

📝 Enforce sentence case for UI strings.

🚫 This rule is _disabled_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

UI text set from code that is not in sentence case. The rule checks string literals, and template
literals without `${…}`, used as:

- the first argument of `setName`, `setDesc`, `setButtonText`, `setTooltip`, `setPlaceholder`,
  `setText` and `setTitle`, the tooltip of `addRibbonIcon` and the label of `addOption`
- the message of `new Notice(…)` and a command's `name` in `addCommand({ … })`
- `createEl()`'s `text` and `title` options and its `attr` values for `aria-label`,
  `aria-description`, `title` and `placeholder`, including nested option objects, and the same
  attributes set with `setAttribute()`
- assignments to `textContent`, `innerText`, `title`, `placeholder` and `ariaLabel`
- strings returned from a `getDisplayText()` method

The message gives the expected text. There is no fix unless you set `allowAutoFix: true`; `--fix`
then rewrites the string and keeps its quotes.

Some text keeps its casing, because it is data rather than prose:

- brand names and acronyms, such as "GitHub" or "PDF"; in the default `loose` mode a camelCase or
  PascalCase word too, unless `enforceCamelCaseLower` is set
- URLs, such as `https://obsidian.md/help`, and date and time formats, such as `YYYY-MM-DD` or `HH:mm`
- "REST" written in capitals. It is also an ordinary word, so both "Use the REST API" and "Take a
  rest" pass.
- a placeholder that shows an example value: a single token with no spaces (`sk-123…`,
  `YYYY-MM-DD`), or text starting with "e.g." or "ex." (`e.g. My Vault`)

Not checked at all: text with inline code (`` `npm install` ``) or HTML tags, text with placeholders
(`{count}`, `%s`), file paths, keyboard shortcuts (`Ctrl+S`), version numbers and all-caps
identifiers (`API_KEY`).

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
