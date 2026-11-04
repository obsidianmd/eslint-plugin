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
- the `text` and `title` options of `createEl()`, `createDiv()` and `createSpan()`, and the `attr`
  values for `aria-label`, `aria-description`, `title` and `placeholder` of those and of
  `createSvg()`, including nested option objects, and the same attributes set with
  `setAttribute()`. A string in place of the options is a CSS class and is not checked.
- assignments to `textContent`, `innerText`, `title`, `placeholder`, `ariaLabel` and
  `ariaDescription`
- strings returned from a `getDisplayText()` method

The message gives the expected text. There is no fix unless you set `allowAutoFix: true`; `--fix`
then rewrites the string and keeps its quotes (a template literal becomes a double-quoted string).

Some text keeps its casing, because it is data rather than prose:

- brand names and acronyms, such as "GitHub" or "PDF", which are held to that casing ("github" is
  reported, expecting "GitHub"); in the default `loose` mode a camelCase or PascalCase word too,
  unless `enforceCamelCaseLower` is set
- URLs, such as `https://obsidian.md/help`, and date and time formats, such as `YYYY-MM-DD` or `HH:mm`
- "REST" written in capitals. It is also an ordinary word, so both "Use the REST API" and "Take a
  rest" pass.
- a placeholder that shows an example value: a single token with no spaces (`sk-123…`,
  `YYYY-MM-DD`), or text starting with "e.g." or "ex." (`e.g. My Vault`)

Not checked at all: text with inline code (`` `npm install` ``) or HTML tags, text with placeholders
(`{count}`, `%s`), file paths, keyboard shortcuts (`Ctrl+S`), version numbers and all-caps
identifiers (`API_KEY`).

The rule is off in `recommended` and `recommendedWithLocalesEn`, because it reports too much
ordinary text to be on by default. 0.3.0 meant to turn it off, but it stayed on through 0.4.2. To use
it, turn it on yourself:

```js
{
  rules: {
    "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }],
  },
}
```

## Options

`brands` and `acronyms` replace the built-in lists ([brands](../../../lib/rules/ui/brands.ts),
[acronyms](../../../lib/rules/ui/acronyms.ts)) rather than add to them, so list the built-in names
you still want. `ignoreWords` keeps the casing of a word written exactly as listed, except the
first word of a sentence. `ignoreRegex` skips a whole string that one of its patterns matches.
`mode: "strict"` lowercases camelCase and PascalCase words, as `enforceCamelCaseLower` does.

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
