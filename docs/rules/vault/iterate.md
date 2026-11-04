# obsidianmd/vault/iterate

📝 Avoid iterating all files to find a file by its path.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

`getFiles().find()` on `vault` or on any property access ending in `.vault` (`this.app.vault`,
`app.vault`, `plugin.app.vault`, `this.vault`), whose predicate does nothing but compare the file's
`path` with a value, with `===` or `==` and on either side. The predicate is an arrow function, with
the comparison as its body or a body that only returns it, or a `function` expression that only
returns it. The path is read as `f.path` or `f?.path`, or destructured from the parameter, as in
`({ path }) => …` or `({ path: p }) => …`:

```ts
const file = this.app.vault.getFiles().find((f) => f.path === path); // reported
this.app.vault.getFiles().find((f) => path == f?.path); // reported
this.app.vault.getFiles().find(({ path }) => path === target); // reported
this.app.vault.getFiles().find(function (f) { return f.path === path; }); // reported
const file = this.app.vault.getFileByPath(path); // use this instead
```

Not reported:

- a predicate that does not compare the file's own `path`, such as `f.parent.path === folder.path`
  or `({ name: path }) => path === target`, or compares it with a value built from the file, such
  as `` `${f.parent.path}/${name}.md` ``: that is not a lookup by a known path;
- a destructured path with a default value, inside a nested pattern or under a computed key, such
  as `({ path = fallback }) => …`;
- a predicate that does more than return the comparison, or that is not written in place, such as a
  variable or a function declared elsewhere;
- an `async` or generator predicate: it returns an object for every file, so `find()` returns the
  first file;
- `getMarkdownFiles().find()`, which also leaves out every file that is not Markdown;
- a computed access such as `this.app["vault"]` or `getFiles()[find]`.

There is no fix; use `getFileByPath()` or `getAbstractFileByPath()`.

## Further reading

- [Avoid iterating all files to find a file by its path - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path)
