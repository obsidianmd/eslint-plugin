# obsidianmd/validate-manifest

📝 Validate the structure of manifest.json for Obsidian plugins.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The checks on `name` and `description` follow the community scanner's review of
`manifest.json`, so they report nothing the review would accept. Where the review applies a
check only to newer submissions, this rule applies the current policy.

- **Fields:** the manifest must be a single JSON object. `author`, `minAppVersion`, `name`,
  `version`, `id`, `description` and `isDesktopOnly` must be present, with the right types.
  `authorUrl`, `fundingUrl` and `helpUrl` are optional. Any other field, and a field defined
  twice, is reported.
- **`id`**, only with the `checkId` option: must not contain "obsidian" or end with "plugin",
  as the developer docs' [manifest reference](https://docs.obsidian.md/Reference/Manifest)
  asks of a new plugin. This is off by default: a published plugin's id can never change, since
  that would orphan every user's install, settings, hotkeys and `obsidian://` links, and the
  review does not check it either. Turn it on for a plugin you have not submitted yet.
- **`name`:** must not include "Obsidian", parts of it ("obsi", "sidian", or a leading
  "ob"), or "Plugin".
- **`description`:** must be 10 to 250 characters and end with `.`, `!` or `?`. It must
  not include "Obsidian", refer to itself ("this plugin", "this tool", "a plugin that",
  "the plugin …"), or repeat or start with the name.
- **`fundingUrl`:** a string, or an object whose values are strings, its keys not repeated.
  An empty string, an empty object and an empty entry are accepted, as the review accepts
  them. Whether the values are valid URLs is not checked.

Not reported: "plugin" elsewhere in an `id` or a description ("Automatically reload
plugins in development."), a description starting with a lowercase letter, and emoji or
other characters in a description. Whether an `id` or `name` is already taken needs the
community directory, so only the review checks it. The review's other checks are not made
here either: the `version` format, a placeholder, email address or URL in `author`, the
`name`'s length and capitals, and whether `authorUrl` and `fundingUrl` are valid, reachable
HTTPS links that use no raw IP address and do not point to the Obsidian website (nor, for
`authorUrl`, to a GitHub repository).

There is no fix. The recommended config runs this rule on `manifest.json` next to your ESLint config,
read with the JSON language; see
[Files linted beyond your source](../configuration.md#files-linted-beyond-your-source).

## Options

<!-- Written by hand: eslint-doc-generator lists allowedWords' nested keys as if they were
top-level options. Keep this table in step with the rule's schema. -->

| Name                       | Description                                                                                                                                                                                                                                 | Type     |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------- |
| `checkId`                  | Also check that the `id` does not contain `obsidian` or end with `plugin`, as the developer docs ask of a new plugin. Off by default: a published plugin's id can never change, and the community scanner does not check it. | Boolean  |
| `allowedWords`             | Words (`obsidian`, `plugin`) to stop checking for, per field, matched case-insensitively. Allowing `obsidian` in the `name` also allows its parts; allowing `plugin` in the `description` allows a self-reference. | Object   |
| `allowedWords.id`          | Forbidden words to allow in the manifest's `id`, with `checkId`.                                                                                                                                                                            | String[] |
| `allowedWords.name`        | Forbidden words to allow in the manifest's `name`.                                                                                                                                                                                          | String[] |
| `allowedWords.description` | Forbidden words to allow in the manifest's `description`.                                                                                                                                                                                   | String[] |
| `ignore`                   | Checks to skip entirely: `noForbiddenWords` (every word check on `id`, `name` and `description`) and `descriptionFormat` (the description's length, punctuation and name checks). See below for why there is no in-file marker. | String[] |

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
        // A new plugin: check its id too, but allow "obsidian" in it.
        "obsidianmd/validate-manifest": ["warn", { checkId: true, allowedWords: { id: ["obsidian"] } }],
    },
}
```

## Further reading

- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
