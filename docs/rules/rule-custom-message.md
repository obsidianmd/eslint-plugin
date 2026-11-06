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

- Only core ESLint rules can be wrapped. A plugin's rule could only be given as an object in the
  options, and ESLint copies rule options with `structuredClone`, which cannot copy a rule's
  functions: ESLint stops with "could not be cloned" before anything is linted. Wrap a plugin's rule
  with [`obsidianmd.withCustomMessages()`](#wrapping-a-plugins-rule) instead.
- A rule name that is not a core rule logs a warning and is skipped.
- A wrapped rule that throws while starting, for example on an option it does not accept, logs the
  error and is skipped.

## In the recommended config

The recommended configs turn the core `no-console` and `no-new-func` rules off and run them through
this rule instead, at `error`, on JavaScript and TypeScript files:

- `no-console`, with `allow: ["warn", "error", "debug"]`: any other console method is reported as
  `[no-console] Avoid unnecessary logging to console. See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+unnecessary+logging+to+console`.
- `no-new-func`: `new Function(…)` and `Function(…)` are reported as
  ``[no-new-func] Using the `Function` constructor is dangerous because it executes arbitrary code, similar to `eval()` ``.

In [test files and tool configs](../configuration.md#test-files), which never run in Obsidian, the
rule runs `no-new-func` alone, so they may log to the console; the `Function` constructor is still
reported there.

Setting this rule's options in your own config replaces that object, as for any rule, so list both
entries again next to the rules you add. Setting only a severity
(`"obsidianmd/rule-custom-message": "warn"`) keeps them. Give such a block your source's `files`:
in a block without `files`, the restated `no-console` reaches test files and tool configs again.

Both are reported as `obsidianmd/rule-custom-message`, so an `eslint-disable` comment naming
`no-console` or `no-new-func` does not silence them. A comment naming this rule does, but the
recommended config's `eslint-comments/no-restricted-disable` forbids disabling `obsidianmd/*` rules
inline and reports the comment as an error in the finding's place. To allow more console methods in
some files, set this rule's options for those files, as described above.

## Options

The rule takes a single configuration object where:
- Keys are the names of the core rules you want to wrap
- Values are objects containing:
  - `messages`: an object mapping original error messages to custom messages. A `Map` (or a
    `Date`, or any object that keeps its entries elsewhere than in its own properties) stops
    ESLint with an error naming the rule, as a `messages` that is not an object does: it would
    match nothing and drop every report.
  - `options`: (optional) Array of options for the wrapped rule; its defaults fill in the rest
    (see above)

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

Only `messages` is required.

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

Use [`obsidianmd.withCustomMessages()`](#wrapping-a-plugins-rule) instead.

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

## Wrapping a plugin's rule

This rule only wraps core ESLint rules (see [What is reported](#what-is-reported)). For a rule from a
plugin, use `obsidianmd.withCustomMessages(rule, messages)`. It returns the rule with your messages,
which you register in a plugin of your own and configure with the rule's own options:

```javascript
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      custom: {
        rules: {
          "no-explicit-any": obsidianmd.withCustomMessages(tseslint.plugin.rules["no-explicit-any"], {
            "Unexpected any": "Avoid `any`: Obsidian's API is typed, so use its types or `unknown`.",
          }),
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // the recommended config enables the original
      "custom/no-explicit-any": ["error", { ignoreRestArgs: true }],
    },
  },
]);
```

`const a: any = 1;` is then reported as:

```
1:10  error  Avoid `any`: Obsidian's API is typed, so use its types or `unknown`.  custom/no-explicit-any
```

`messages` is an object of strings, as in this rule; anything else, such as a `Map`, throws a
`TypeError` that says what it was given. Its keys match as in this rule: a report whose message,
with its placeholders filled in, equals or contains a key shows that key's value instead, and the
first matching key wins. Unlike this rule:

- A report that matches no key is reported unchanged, not dropped.
- The new message replaces the whole message, without a `[rule-name]` prefix. It can use the
  placeholders the rule reports `data` for, such as `{{name}}`.
- Each wrapped rule has its own name and severity, and `eslint-disable` comments name it
  (`custom/no-explicit-any`).

Everything else is the wrapped rule's: its options, which ESLint checks against the rule's schema
and fills in from its defaults, its fixes and suggestions, and its use of type information. Turn the
original rule off where you enable the wrapped one, or both report.

In an `eslint.config.ts`, take typescript-eslint's rules from `@typescript-eslint/eslint-plugin`
(`import tsPlugin from "@typescript-eslint/eslint-plugin"`): `tseslint.plugin` is typed without them.
With pnpm, add `@typescript-eslint/eslint-plugin` to your `devDependencies` first, at your
`typescript-eslint` version: pnpm does not let your config import a package your project does not list.

ESLint's `--cache` does not see a change to the messages, which are not part of the rule's options:
delete the cache file (`.eslintcache` by default) after changing them.

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

Separate configuration blocks can set a different severity per file pattern, but within a file every rule wrapped here shares it. To give a wrapped rule a severity of its own, wrap it with [`obsidianmd.withCustomMessages()`](#wrapping-a-plugins-rule) instead: each rule it returns has its own name and severity. That is the way for a plugin's rule, and it accepts a core rule too.
