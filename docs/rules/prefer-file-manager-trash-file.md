# obsidianmd/prefer-file-manager-trash-file

📝 Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

## What is reported

A call to `trash()` or `delete()` on Obsidian's `Vault`, recognised by type, so `this.app.vault`, a
variable holding the vault and a `Vault` parameter are all found, also when they may be null or
undefined, as in `vault?.delete(file)` with `vault: Vault | null`, or `plugin?.app.vault.trash(file)`.
`Vault.delete()` removes a file for good, and `Vault.trash()` picks the trash itself, both ignoring
the user's "Deleted files" setting. `FileManager.trashFile()` follows that setting:

```ts
await this.app.vault.delete(file); // reported
await this.app.fileManager.trashFile(file); // respects the user's choice
```

A computed call that spells the name out, such as `vault["delete"](file)`, is reported too.

Not reported: other `Vault` methods, a computed call by a variable, such as
`vault[method](file)`, `delete()` on anything that is not a `Vault`, such as a `Map` or a `Set`, and
the lower-level adapter, such as `this.app.vault.adapter.remove()`.

The rule needs type information, so the recommended config runs it on TypeScript files only.

## Suggestion

There is no autofix: the file then goes where the user's "Deleted files" setting says, which may
not be what the code meant. A report offers an editor suggestion instead, which you review before
applying: call `trashFile()` on the `fileManager` next to the vault, keeping `await`, `?.`,
parentheses and comments. The second argument, `system` of `trash()` or `force` of `delete()`, is
dropped, since the setting decides that now:

```ts
await this.app.vault.trash(file, true);        // suggests await this.app.fileManager.trashFile(file)
plugin?.app.vault.delete(file);                // suggests plugin?.app.fileManager.trashFile(file)
```

Nothing is offered:

- where the vault is not read as `<expr>.vault`, such as a `vault` variable or parameter, or
  `app["vault"]`: only there is `<expr>.fileManager` known to be next to it;
- where the type of `<expr>` has no `fileManager` with a `trashFile()`, as with `obsidian` typings
  older than 1.6.6 or an object of the plugin's own;
- where the dropped argument is anything but a literal or a variable, such as `useSystemTrash()`, or
  a comment is next to it; and with a spread or more than two arguments;
- with a `minAppVersion` below 1.6.6, which has no `trashFile()`. Where no version is known (no
  `manifest.json` with a valid `minAppVersion`, and no `minAppVersion` option), the suggestion is
  offered and says it needs Obsidian 1.6.6.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
