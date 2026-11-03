# obsidianmd/prefer-file-manager-trash-file

📝 Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A call to `trash()` or `delete()` on Obsidian's `Vault`, recognised by type, so `this.app.vault`, a
variable holding the vault and a `Vault` parameter are all found. `Vault.delete()` removes a file for
good, and `Vault.trash()` picks the trash itself, both ignoring the user's "Deleted files" setting.
`FileManager.trashFile()` follows that setting:

```ts
await this.app.vault.delete(file); // reported
await this.app.fileManager.trashFile(file); // respects the user's choice
```

There is no fix. Not reported: other `Vault` methods, `delete()` on anything that is not a `Vault`,
such as a `Map` or a `Set`, and the lower-level adapter, such as `this.app.vault.adapter.remove()`.
