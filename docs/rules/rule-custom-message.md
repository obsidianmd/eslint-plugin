# Allows redefining error messages from other ESLint rules that don't provide this functionality natively (`obsidianmd/rule-custom-message`)

<!-- end auto-generated rule header -->

Allows redefining error messages from other ESLint rules that don't provide this functionality natively.

## Rule Details

This rule acts as a wrapper around other ESLint rules, allowing you to customize their error messages while preserving all other functionality (including fixes). The custom message will be displayed with the original rule name in brackets (e.g., `[no-console] Your custom message`).

This is particularly useful when you want to:
- Provide team-specific guidance or documentation links
- Make error messages more context-appropriate for your project
- Maintain consistent messaging across your codebase

## Options

The rule takes a single configuration object where:
- Keys are the names of rules you want to wrap
- Values are objects containing:
  - `messages`: Map of original error messages to custom messages
  - `options`: (optional) Array of options to pass to the wrapped rule
  - `rule`: (optional) For plugin rules, the rule object from the plugin

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

For built-in ESLint rules, only `messages` and `options` are needed. For plugin rules, you also need to provide the `rule` object.

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

To wrap rules from ESLint plugins, import the plugin and provide the rule object in the configuration:

```javascript
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "obsidianmd/rule-custom-message": [
        "error",
        {
          "@typescript-eslint/no-explicit-any": {
            messages: {
              "Unexpected any. Specify a different type.":
                "Avoid using 'any'. Use 'unknown' or define a proper type."
            },
            options: [],
            rule: typescriptPlugin.rules["no-explicit-any"]
          }
        }
      ]
    }
  }
];
```

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

## Implementation Notes

- The wrapper preserves auto-fixes from the original rule
- Suggestions are not preserved (they reference the original rule's message IDs)
- The rule creates a wrapped context that intercepts `report()` calls
- Message matching is done via exact match or substring inclusion
- For built-in ESLint rules, no additional configuration is needed beyond `messages` and `options`
- For plugin rules, provide the rule object via the `rule` property

## Severity Configuration

The `obsidianmd/rule-custom-message` rule itself has its own severity level (error/warn/off). All rules wrapped in a single `rule-custom-message` configuration will share this severity level.

If you need different severities for different wrapped rules, create separate configuration blocks targeting different file patterns.
