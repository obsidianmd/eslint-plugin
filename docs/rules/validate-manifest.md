# obsidianmd/validate-manifest

📝 Validate the structure of manifest.json for Obsidian plugins.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name           | Description                                                                                                                                                                                                                                 | Type     |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------- |
| `allowedWords` | Words to drop from the forbidden list, per field. Use this for findings that can never be acted on, such as a published plugin id that will always contain 'obsidian'.                                                                      | Object   |
| `description`  | Forbidden words to allow in the manifest's 'description'.                                                                                                                                                                                   | String[] |
| `id`           | Forbidden words to allow in the manifest's 'id'.                                                                                                                                                                                            | String[] |
| `ignore`       | Checks to skip entirely. A manifest cannot carry an ignore marker of its own: a comment is a JSON parse error and would stop Obsidian loading the plugin, and an ignore key ships to every user and is itself reported as a disallowed key. | String[] |
| `name`         | Forbidden words to allow in the manifest's 'name'.                                                                                                                                                                                          | String[] |

<!-- end auto-generated rule options list -->

A manifest cannot carry an ignore marker of its own. The only marker ESLint
understands is a comment, and a comment in strict JSON is a parse error that
would also stop Obsidian loading the plugin, since both its loader and the
community directory use `JSON.parse`. An ignore *key* survives parsing but ships
to every user and is itself reported as a disallowed key. So the escape hatch has
to live in the ESLint config:

```js
{
    files: ["manifest.json"],
    language: "json/json",
    rules: {
        // A published plugin id can never change, so this finding can never be acted on.
        "obsidianmd/validate-manifest": ["warn", { allowedWords: { id: ["obsidian"] } }],
    },
}
```

## Further reading

- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
