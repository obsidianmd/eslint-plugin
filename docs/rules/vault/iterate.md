# obsidianmd/vault/iterate

📝 Avoid iterating all files to find a file by its path.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

`getFiles().find()` with a predicate that compares a file's `path` with `===` or `==`, on `vault`
or on any property access ending in `.vault`: `this.app.vault`, `app.vault`, `plugin.app.vault`,
`this.vault`.

```ts
const file = this.app.vault.getFiles().find((f) => f.path === path); // reported
const file = this.app.vault.getFileByPath(path); // use this instead
```

## Further reading

- [Avoid iterating all files to find a file by its path - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path)
