# obsidianmd/ui/sentence-case-locale-module

📝 Enforce sentence case for English TS/JS locale module strings.

⚠️ This rule _warns_ in the 🇬🇧 `recommendedWithLocalesEn` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

Checks the strings of an English locale module, such as `en.ts`, `en-GB.ts` or a module under an `en/`
directory, and reports those not in sentence case. The strings checked are those of an exported
object, including nested objects and arrays:

```ts
export default { autoReveal: "Enable Auto Reveal" }; // reported
const strings = { openNote: "Open note" };
export { strings }; // checked as well, as are `export default strings` and `export const x = { … }`
```

The message gives the expected text, and with `allowAutoFix: true`, `--fix` rewrites the string.
Values are judged as in [`ui/sentence-case`](sentence-case.md): URLs, date formats such as
`YYYY-MM-DD`, brand names and "REST" written in capitals keep their casing.

Not reported: keys, an object that is not exported, strings in functions, template literals with
`${…}`, and modules that are not English locale files, such as `fr.ts`.

`recommendedWithLocalesEn` runs this rule on `.ts`, `.js`, `.cjs` and `.mjs` files named `en`,
`en-*` or `en_*`, and on those under an `en/` directory.

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
