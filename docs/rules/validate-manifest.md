# obsidianmd/validate-manifest

📝 Validate the structure of manifest.json for Obsidian plugins.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The text checks follow the community scanner's review of `manifest.json`, so this rule
reports nothing the review would accept. Where the review applies a check only to newer
submissions, this rule applies the current policy.

- **Fields:** `author`, `minAppVersion`, `name`, `version`, `id`, `description` and
  `isDesktopOnly` must be present, with the right types. `authorUrl`, `fundingUrl` and
  `helpUrl` are optional. Any other field, and a field defined twice, is reported.
- **`id`:** must not contain "obsidian" or end with "plugin", as the developer docs'
  [manifest reference](https://docs.obsidian.md/Reference/Manifest) requires.
- **`name`:** must not include "Obsidian", parts of it ("obsi", "sidian", or a leading
  "ob"), or "Plugin".
- **`description`:** must be 10 to 250 characters and end with `.`, `!` or `?`. It must
  not include "Obsidian", refer to itself ("this plugin", "a plugin that", "the plugin
  …"), or repeat or start with the name.
- **`fundingUrl`:** a URL string, or an object of non-empty URL strings.

Not reported: "plugin" elsewhere in an `id` or a description ("Automatically reload
plugins in development."), a description starting with a lowercase letter, and emoji or
other characters in a description. Whether an `id` or `name` is already taken needs the
community directory, so only the review checks it.

## Options

<!-- Written by hand: eslint-doc-generator lists allowedWords' nested keys as if they were
top-level options. Keep this table in step with the rule's schema. -->

| Name                       | Description                                                                                                                                                                                                                                 | Type     |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------- |
| `allowedWords`             | Words (`obsidian`, `plugin`) to stop checking for, per field, matched case-insensitively. Allowing `obsidian` in the `name` also allows its parts; allowing `plugin` in the `description` allows a self-reference. Use this for findings that can never be acted on, such as a published plugin id that will always contain 'obsidian'. | Object   |
| `allowedWords.id`          | Forbidden words to allow in the manifest's `id`.                                                                                                                                                                                            | String[] |
| `allowedWords.name`        | Forbidden words to allow in the manifest's `name`.                                                                                                                                                                                          | String[] |
| `allowedWords.description` | Forbidden words to allow in the manifest's `description`.                                                                                                                                                                                   | String[] |
| `ignore`                   | Checks to skip entirely: `noForbiddenWords` (every word check on `id`, `name` and `description`) and `descriptionFormat` (the description's length, punctuation and name checks). A manifest cannot carry an ignore marker of its own: a comment is a JSON parse error and would stop Obsidian loading the plugin, and an ignore key ships to every user and is itself reported as a disallowed key. | String[] |

A manifest cannot carry an ignore marker of its own. The only marker ESLint
understands is a comment, and a comment in strict JSON is a parse error that
would also stop Obsidian loading the plugin, since both its loader and the
community directory use `JSON.parse`. An ignore *key* survives parsing but ships
to every user and is itself reported as a disallowed key. So the escape hatch has
to live in the ESLint config:

```js
import json from "@eslint/json";
import obsidianmd from "eslint-plugin-obsidianmd";

// in the defineConfig([...]) array:
{
    files: ["manifest.json"],
    language: "json/json",
    plugins: { json, obsidianmd },
    rules: {
        // A published plugin id can never change, so this finding can never be acted on.
        "obsidianmd/validate-manifest": ["warn", { allowedWords: { id: ["obsidian"] } }],
    },
}
```

## Further reading

- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
