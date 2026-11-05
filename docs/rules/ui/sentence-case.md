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
  `ariaDescription`, but not to a property of `dataset` (`el.dataset.title = …` sets a data
  attribute), and not text appended with `+=`. Other objects have a `title` or `placeholder` too,
  such as a note's frontmatter, so with type information those two are checked only on an element
  (an `Element` subtype such as `HTMLElement`), on the document, or on a value whose type is
  `any`, `unknown` or unresolved: `frontmatter.title = "Untitled Note"` with
  `frontmatter: { title: string }` is not checked. Without type information every such assignment
  is checked.
- strings returned from a `getDisplayText()` method

A template literal is judged on its value, with its escapes decoded: `` `Open\tSettings` `` is
"Open", a tab and "Settings".

The message gives the expected text. There is no fix unless you set `allowAutoFix: true`. `--fix`
then changes the case of the letters that need it and nothing else: the quotes or backticks, every
escape (`\t`, `\"`, `\u00e9`) and an `as`, `satisfies` or `!` after the string stay as written.
Where a letter that has to change is written as an escape, as in `'Open \u0053ettings'`, the text
is reported without a fix.

Which words take a capital:

- the first word of each sentence, after `.`, `!` or `?` and a space. After a colon or a semicolon,
  and after an abbreviation such as "e.g.", "i.e.", "etc.", "vs.", "approx." or "no.", the next
  word may take either case: "Choose a folder, e.g. notes" and "Choose a folder, e.g. Notes" both
  pass.
- a first word after punctuation, a bullet, an arrow, quotes or a list number keeps the case it is
  written in: "- Item", "- item", "• Bullet", "→ Next", `"Open" settings` and "1) Open settings"
  all pass. So do the first word of a label in brackets or parentheses and the first word after
  it: "[Beta] Feature", "[beta] feature" and "(Beta) Sync" pass. The words after that are later
  words, so "- Open Settings" is reported, expecting "- Open settings". A word right after "(" is
  the first word, as before, so "(open settings)" and "(beta) sync" are reported.
- a number before the first word takes its place, so the word after the number is not capitalized:
  "2 files selected" passes, and "2 Files selected" is reported. A word that starts with a number,
  such as "1st", "3D", "4K" or "10x", keeps its letters as written, wherever it is: "Open 3D view"
  passes.
- emoji before the first word are not text, so "✅ Open settings" and "⚠️ Open settings" pass.

Some text keeps its casing, because it is data rather than prose:

- brand names and acronyms, such as "GitHub" or "PDF", which are held to that casing ("github" is
  reported, expecting "GitHub"). An acronym listed in mixed case, such as "OAuth", keeps that
  casing; any other is written in capitals. In the default `loose` mode a camelCase or PascalCase
  word keeps its casing too, unless `enforceCamelCaseLower` is set.
- a brand whose name is also an ordinary word: "Windows", "Cursor", "Slack", "X", "Notion" and
  "React". In lower case it is that word and is left alone ("Close all windows", "Move the cursor",
  "Views react to changes"); written as the brand it keeps that casing ("Install on Windows").
  Neither is rewritten into the other, so title-case text keeps the capital it has: "Close All
  Windows" is reported, expecting "Close all Windows". Any other casing, such as "WINDOWS", is
  corrected to the brand's. This holds for these names in your own `brands` too.
- URLs, such as `https://obsidian.md/help`, and date and time formats, such as `YYYY-MM-DD`,
  `HH:mm`, `hh:mm A`, `MMM D, YYYY`, `DD MMM YYYY` or `dddd, MMMM Do`. Tokens joined by spaces or
  commas are a format only when one of them is never a word, such as `MMM`, `YYYY` or `DD`, so "Do
  A barrel roll" is text. A lone "A" is a word, so "Create A new note" is reported.
- "REST" written in capitals. It is also an ordinary word, so both "Use the REST API" and "Take a
  rest" pass.
- a placeholder that shows an example value: a single token with no spaces (`sk-123…`,
  `YYYY-MM-DD`), or text starting with "e.g." or "ex." (`e.g. My Vault`)

Not checked at all: text with inline code (`` `npm install` ``) or HTML tags, text with placeholders
(`{count}`, `%s`), file paths and file names (`config.json`, `docs/readme.md`, `.obsidian/plugins`,
`https://x.com/a.b`), keyboard shortcuts (`Ctrl+S`), a version number on its own (`v1.2.3`) and
all-caps identifiers (`API_KEY`). A number such as "1.2", or a brand with a dot such as "Node.js",
does not make text a file name, so "Version 1.2 Released" and "Install Node.js First" are checked.

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
