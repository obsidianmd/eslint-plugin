# Enforce sentence case for UI strings (`obsidianmd/ui/sentence-case`)

💼 This rule is set to warn in the ✅ `recommended` config.

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
    "obsidianmd/ui/sentence-case": [
      "warn",
      {
        "enforceCamelCaseLower": true
      }
    ]
  }
}
```

### Known limitations

Sentence detection may incorrectly split on abbreviations (Dr., Inc., etc.). Use single sentences or adjust rule options when needed.
