# obsidianmd/object-assign

📝 Discourage using `Object.assign` with two arguments.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

`Object.assign()` with exactly two arguments whose target is named like a set of defaults, that is,
whose name contains `default` in any case. The target is a variable such as `DEFAULT_SETTINGS` or
`defaultConfig`, or a property such as `this.defaults`, `this.defaultSettings` or
`Constants.DEFAULT_SETTINGS`, whose own (last) name is matched. `Object.assign()` writes into its
first argument, so this overwrites the defaults themselves: after the first load they hold the user's
settings, and anything that reads them later, such as a "reset to defaults" button, gets the wrong
values.

```ts
this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData()); // reported
this.settings = Object.assign(this.defaults, await this.loadData()); // reported
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // copy into a new object
```

There is no fix. Not reported:

- a target whose name does not contain `default`, including a property of the defaults such as
  `DEFAULT_SETTINGS.editor`, where only `editor` is matched
- a property named `default` (a module's default export) or `defaultView` (a document's window), and a
  computed property with a key that is not a string literal, such as `this[key]`
- an object literal as the second argument, such as `Object.assign(DEFAULT_SETTINGS, { theme: "dark" })`
- three or more arguments, as in the `{}` form above
