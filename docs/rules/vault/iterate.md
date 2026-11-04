# obsidianmd/vault/iterate

📝 Avoid iterating all files to find a file by its path.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

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

## Suggestion

There is no autofix: `getFileByPath()` returns `null`, not `undefined`, when there is no such file.
A report offers an editor suggestion instead, which you review before applying: `getFiles().find(…)`
becomes `getFileByPath(…)` with the path the predicate compares with, on the same vault. `?.`, line
breaks, and parentheses and comments in the path are kept:

```ts
const file = this.app.vault.getFiles().find((f) => f.path === path);
// suggests:
const file = this.app.vault.getFileByPath(path);
```

`getFiles()` lists files only, so `getFileByPath()` is the one that finds the same file;
`getAbstractFileByPath()` would also return a folder at that path.

Nothing is offered:

- where the path is not a plain value: anything but variables, properties, literals, template
  literals and `+` of those, such as `normalizePath(path)` or `this.getPath()`, which `find()` reads
  once per file and `getFileByPath()` once, or a name of a `function` predicate's own, such as its
  `this` or `arguments`;
- with a second argument to `find()`, or a comment that would be lost;
- where the code relies on `undefined`: it compares the result, or the variable it is kept in, with
  `undefined` using `===` or `!==`, or with `typeof`; that variable is a `let` set again later; or,
  without type information, the variable is annotated as `TFile | undefined`;
- with type information, where the result goes where `undefined` is accepted and `null` is not, such
  as a `TFile | undefined` variable, return type or parameter; where the path is not a `string`;
  and where the vault has no `getFileByPath()`, as with `obsidian` typings older than 1.5.7;
- with a `minAppVersion` below 1.5.7, which has no `getFileByPath()`. Where no version is known (no
  `manifest.json` with a valid `minAppVersion`, and no `minAppVersion` option), the suggestion is
  offered and says it needs Obsidian 1.5.7.

## Further reading

- [Avoid iterating all files to find a file by its path - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path)

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
