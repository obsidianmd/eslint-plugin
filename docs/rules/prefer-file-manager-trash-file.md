# obsidianmd/prefer-file-manager-trash-file

📝 Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

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

There is no fix. Not reported: other `Vault` methods, a computed call by a variable, such as
`vault[method](file)`, `delete()` on anything that is not a `Vault`, such as a `Map` or a `Set`, and
the lower-level adapter, such as `this.app.vault.adapter.remove()`.

The rule needs type information, so the recommended config runs it on TypeScript files only.
