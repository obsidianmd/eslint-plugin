# obsidianmd/rule-custom-message

📝 Allows redefining error messages from other ESLint rules that don't provide this functionality natively.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Allows redefining error messages from other ESLint rules that don't provide this functionality natively.

## What is reported

Each configured rule runs inside this one. A report from it whose message equals, or contains, a
key of `messages` is reported again as `[rule-name] custom message`, at this rule's severity and
where the wrapped rule reported it; the first matching key wins. A report that matches no key is
dropped, so list every message you want to keep.

This is particularly useful when you want to:
- Provide team-specific guidance or documentation links
- Make error messages more context-appropriate for your project
- Maintain consistent messaging across your codebase

The message a key is matched against is the one ESLint shows for the wrapped rule, its placeholders
filled in, so a message copied from ESLint's output matches, and so does any part of it ("has too
many parameters").

A matched report keeps the wrapped rule's fix, which `--fix` applies, and its suggestions, under the
wrapped rule's descriptions.

The wrapped rule gets the options ESLint would give it: `options` with the defaults of its schema
filled in, merged over its `meta.defaultOptions`. So a core rule that reads its options, such as
`no-console`, also runs without `options`. The options are not checked against the wrapped rule's
schema, so a wrong one is not reported as a configuration error.

Limitations:

- Only core ESLint rules can be wrapped. ESLint 9 copies rule options with `structuredClone`, which
  cannot copy a rule's functions, so a configuration that gives a plugin rule object as `rule` stops
  ESLint with "could not be cloned" before anything is linted.
- A rule name that is not a core rule logs a warning and is skipped.
- A wrapped rule that throws while starting, for example on an option it does not accept, logs the
  error and is skipped.

## Options

The rule takes a single configuration object where:
- Keys are the names of rules you want to wrap
- Values are objects containing:
  - `messages`: Map of original error messages to custom messages
  - `options`: (optional) Array of options for the wrapped rule; its defaults fill in the rest
    (see above)
  - `rule`: (optional) Meant for a plugin rule object, which ESLint 9 cannot pass (see above)

```json
{
  "obsidianmd/rule-custom-message": [
    "error",
    {
      "rule-name": {
        "messages": {
          "Original error message": "Custom error message"
        },
        "options": [{ /* rule options */ }]
      }
    }
  ]
}
```

For built-in ESLint rules, only `messages` is required.

## Examples

### Wrapping Built-in ESLint Rules

```javascript
export default [
  {
    files: ["**/*.js"],
    plugins: {
      obsidianmd: obsidianmd,
    },
    rules: {
      "no-console": "off", // Disable the original rule
      "obsidianmd/rule-custom-message": [
        "error",
        {
          "no-console": {
            messages: {
              "Unexpected console statement. Only these console methods are allowed: warn, error, debug.":
                "Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console"
            },
            options: [{ allow: ["warn", "error", "debug"] }]
          }
        }
      ]
    }
  }
];
```

With this configuration, instead of seeing:

```
4:1  error  Unexpected console statement. Only these console methods are allowed: warn, error, debug.  no-console
```

You'll see:

```
4:1  error  [no-console] Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console  obsidianmd/rule-custom-message
```

### Wrapping Plugin Rules

Not possible with ESLint 9: a plugin rule object given as `rule` stops ESLint, as described under
[What is reported](#what-is-reported).

### Partial Message Matching

The rule supports partial matching, so you can match messages that contain certain text:

```javascript
{
  "obsidianmd/rule-custom-message": [
    "error",
    {
      "no-console": {
        messages: {
          "Unexpected console statement": "Custom message for all console violations"
        },
        options: [{ allow: ["warn", "error"] }]
      }
    }
  ]
}
```

This will match any `no-console` error message that includes "Unexpected console statement".

## When to Use

- You want to provide project-specific guidance in error messages
- You need to include links to internal documentation
- You're enforcing coding standards and want messages that reference your style guide
- You want more user-friendly or contextual error messages

## When Not to Use

- If the original rule already supports custom messages (check the rule's documentation first)
- If you just want to disable a rule (use ESLint's built-in configuration instead)
- If you're wrapping many rules with the same message (consider creating a custom rule instead)

## Severity Configuration

The `obsidianmd/rule-custom-message` rule itself has its own severity level (error/warn/off). All rules wrapped in a single `rule-custom-message` configuration will share this severity level.

If you need different severities for different wrapped rules, create separate configuration blocks targeting different file patterns.
