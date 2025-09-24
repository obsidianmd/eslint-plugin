# Enforce sentence case for English TS/JS locale module strings (`obsidianmd/ui/sentence-case-locale-module`)

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Options

### What gets flagged as incorrect

- `mode` (default `"loose"`)
  - `"loose"`: Allows CamelCase words like `AutoReveal` to pass
  - `"strict"`: Flags ALL CamelCase words as incorrect
- `enforceCamelCaseLower` (boolean, default `false`)
  - Only works in `"loose"` mode
  - When `true`: Flags CamelCase like `AutoReveal` → suggests `auto-reveal`
  - When `false`: CamelCase passes without warnings

### Exceptions (never flagged)

- `brands` (string array) - Brand names like `GitHub`, `macOS`
- `acronyms` (string array) - Acronyms like `PDF`, `URL`
- `ignoreWords` (string array) - Specific words to skip
- `ignoreRegex` (string array) - Patterns to skip

### Auto-fixing

- `allowAutoFix` (boolean, default `false`)
  - When `true`: ESLint's `--fix` command can change the text
  - When `false`: Only reports issues, never auto-fixes

### Example

```js
{
  "rules": {
    "obsidianmd/ui/sentence-case-locale-module": [
      "warn",
      {
        "enforceCamelCaseLower": true
      }
    ]
  }
}
```
