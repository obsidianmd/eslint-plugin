# obsidianmd/object-assign

📝 Discourage using `Object.assign` with two arguments.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

`Object.assign()` with exactly two arguments whose target is a variable named like a set of defaults,
that is, whose name contains `default` in any case, such as `DEFAULT_SETTINGS` or `defaultConfig`.
`Object.assign()` writes into its first argument, so this overwrites the defaults themselves: after
the first load they hold the user's settings, and anything that reads them later, such as a "reset to
defaults" button, gets the wrong values.

```ts
this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData()); // reported
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // copy into a new object
```

There is no fix. Not reported:

- a target whose name does not contain `default`, or that is a property such as `this.defaults`
- an object literal as the second argument, such as `Object.assign(DEFAULT_SETTINGS, { theme: "dark" })`
- three or more arguments, as in the `{}` form above
